import {
  GameFlowService,
  type GameState,
  type GameTrackCard,
} from "@tunetrack/game-engine";
import { randomUUID } from "node:crypto";
import {
  type AwardTtPayloadParsed,
  type BuyTimelineCardWithTtPayloadParsed,
  type CloseRoomPayloadParsed,
  type ClaimChallengePayloadParsed,
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  type ConfirmRevealPayloadParsed,
  type PlaceChallengePayloadParsed,
  type PlaceCardPayloadParsed,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
  type ResolveChallengeWindowPayloadParsed,
  type RoomId,
  type SkipTrackWithTtPayloadParsed,
  type SpotifyAccountType,
  type StartGamePayloadParsed,
  type TransferHostPayloadParsed,
  type UpdatePlayerProfilePayloadParsed,
  type UpdatePlayerSettingsPayloadParsed,
  type UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import { ChallengeTimerManager } from "./ChallengeTimerManager.js";
import { DisconnectTimerManager } from "./DisconnectTimerManager.js";
import { createTrackCardMap, mapGameStateToPublicRoomState } from "./roomStateMappers.js";

interface SocketRoomMembership {
  playerId: string;
  roomId: RoomId;
  sessionId: string;
}

interface SessionRoomMembership {
  playerId: string;
  roomId: RoomId;
}

interface RoomRecord {
  gameState: GameState | null;
  roomState: PublicRoomState;
  trackCardsById: Map<string, GameTrackCard>;
  importedDeck: GameTrackCard[] | null;
}

export interface JoinRoomResult {
  playerId: string;
  roomState: PublicRoomState;
}

export class RoomRegistry {
  private static readonly DEFAULT_RECONNECT_GRACE_PERIOD_MS = 30_000;

  private readonly roomsById = new Map<RoomId, RoomRecord>();
  private readonly socketMemberships = new Map<string, SocketRoomMembership>();
  private readonly sessionMemberships = new Map<string, SessionRoomMembership>();
  private readonly challengeTimers = new ChallengeTimerManager();
  private readonly disconnectTimers = new DisconnectTimerManager();
  private roomStateChangedListener: ((roomState: PublicRoomState) => void) | null =
    null;

  public constructor(
    private readonly gameFlowService = new GameFlowService(),
    private readonly reconnectGracePeriodMs =
      RoomRegistry.DEFAULT_RECONNECT_GRACE_PERIOD_MS,
  ) {}

  public setRoomStateChangedListener(
    listener: (roomState: PublicRoomState) => void,
  ): void {
    this.roomStateChangedListener = listener;
  }

  public addPlayerToRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    const existingRoomRecord = this.roomsById.get(roomId);
    const existingSessionMembership = this.sessionMemberships.get(sessionId);

    if (existingSessionMembership?.roomId === roomId) {
      return this.restorePlayerSession(
        roomId,
        existingSessionMembership.playerId,
        socketId,
        sessionId,
      );
    }

    const playerId = randomUUID();

    if (!existingRoomRecord) {
      const playerState: PublicPlayerState = {
        id: playerId,
        displayName,
        isHost: true,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        ttTokenCount: 0,
        startingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
      };

      const settings: PublicRoomSettings = {
        targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
        defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
        startingTtTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
        revealConfirmMode: "host_only",
        ttModeEnabled: false,
        challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
        playlistImported: false,
        importedTrackCount: 0,
        spotifyAuthStatus: "none",
        spotifyAccountType: null,
      };

      const roomState: PublicRoomState = {
        roomId,
        status: "lobby",
        hostId: playerId,
        players: [playerState],
        timelines: { [playerId]: [] },
        currentTrackCard: null,
        targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
        settings,
        turn: null,
        challengeState: null,
        revealState: null,
        winnerPlayerId: null,
      };

      this.roomsById.set(roomId, {
        gameState: null,
        roomState,
        trackCardsById: new Map<string, GameTrackCard>(),
        importedDeck: null,
      });
      this.socketMemberships.set(socketId, { playerId, roomId, sessionId });
      this.sessionMemberships.set(sessionId, { playerId, roomId });

      return { playerId, roomState };
    }

    if (existingRoomRecord.roomState.status !== "lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }

    const playerState: PublicPlayerState = {
      id: playerId,
      displayName,
      isHost: false,
      connectionStatus: "connected",
      disconnectedAtEpochMs: null,
      reconnectExpiresAtEpochMs: null,
      ttTokenCount: existingRoomRecord.roomState.settings.startingTtTokenCount,
      startingTimelineCardCount:
        existingRoomRecord.roomState.settings.defaultStartingTimelineCardCount,
    };

    const nextRoomState: PublicRoomState = {
      ...existingRoomRecord.roomState,
      players: [...existingRoomRecord.roomState.players, playerState],
      timelines: {
        ...existingRoomRecord.roomState.timelines,
        [playerId]: [],
      },
    };

    this.roomsById.set(roomId, { ...existingRoomRecord, roomState: nextRoomState });
    this.socketMemberships.set(socketId, { playerId, roomId, sessionId });
    this.sessionMemberships.set(sessionId, { playerId, roomId });

    return { playerId, roomState: nextRoomState };
  }

  public updateRoomSettings(
    socketId: string,
    roomId: RoomId,
    roomSettingsPayload: UpdateRoomSettingsPayloadParsed,
  ): PublicRoomState {
    const membership = this.socketMemberships.get(socketId);
    const roomRecord = this.roomsById.get(roomId);

    if (!membership || membership.roomId !== roomId || !roomRecord) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS");
    }

    const didDefaultStartingCardCountChange =
      roomRecord.roomState.settings.defaultStartingTimelineCardCount !==
      roomSettingsPayload.defaultStartingTimelineCardCount;
    const didStartingTtTokenCountChange =
      roomRecord.roomState.settings.startingTtTokenCount !==
      roomSettingsPayload.startingTtTokenCount;
    const didEnableTtMode =
      !roomRecord.roomState.settings.ttModeEnabled &&
      roomSettingsPayload.ttModeEnabled;
    const shouldResetStartingTtTokenCount =
      didStartingTtTokenCountChange || didEnableTtMode;

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      targetTimelineCardCount: roomSettingsPayload.targetTimelineCardCount,
      players:
        didDefaultStartingCardCountChange || shouldResetStartingTtTokenCount
          ? roomRecord.roomState.players.map((player) => ({
              ...player,
              ...(didDefaultStartingCardCountChange
                ? { startingTimelineCardCount: roomSettingsPayload.defaultStartingTimelineCardCount }
                : {}),
              ...(shouldResetStartingTtTokenCount
                ? { ttTokenCount: roomSettingsPayload.startingTtTokenCount }
                : {}),
            }))
          : roomRecord.roomState.players,
      settings: {
        ...roomRecord.roomState.settings,
        targetTimelineCardCount: roomSettingsPayload.targetTimelineCardCount,
        defaultStartingTimelineCardCount:
          roomSettingsPayload.defaultStartingTimelineCardCount,
        startingTtTokenCount: roomSettingsPayload.startingTtTokenCount,
        revealConfirmMode: roomSettingsPayload.revealConfirmMode,
        ttModeEnabled: roomSettingsPayload.ttModeEnabled,
        challengeWindowDurationSeconds:
          roomSettingsPayload.challengeWindowDurationSeconds,
      },
    };

    this.roomsById.set(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public updatePlayerSettings(
    socketId: string,
    updatePlayerSettingsPayload: UpdatePlayerSettingsPayloadParsed,
  ): PublicRoomState {
    const membership = this.socketMemberships.get(socketId);
    const roomRecord = this.roomsById.get(updatePlayerSettingsPayload.roomId);

    if (
      !membership ||
      membership.roomId !== updatePlayerSettingsPayload.roomId ||
      !roomRecord
    ) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS");
    }

    const nextPlayers = roomRecord.roomState.players.map((player) =>
      player.id === updatePlayerSettingsPayload.playerId
        ? {
            ...player,
            startingTimelineCardCount:
              updatePlayerSettingsPayload.startingTimelineCardCount,
            ttTokenCount: updatePlayerSettingsPayload.startingTtTokenCount,
          }
        : player,
    );

    if (!nextPlayers.some((p) => p.id === updatePlayerSettingsPayload.playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      players: nextPlayers,
    };

    this.roomsById.set(updatePlayerSettingsPayload.roomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public updatePlayerProfile(
    socketId: string,
    updatePlayerProfilePayload: UpdatePlayerProfilePayloadParsed,
  ): PublicRoomState {
    const membership = this.socketMemberships.get(socketId);
    const roomRecord = this.roomsById.get(updatePlayerProfilePayload.roomId);

    if (
      !membership ||
      membership.roomId !== updatePlayerProfilePayload.roomId ||
      !roomRecord
    ) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    if (roomRecord.roomState.status !== "lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      players: roomRecord.roomState.players.map((player) =>
        player.id === membership.playerId
          ? { ...player, displayName: updatePlayerProfilePayload.displayName }
          : player,
      ),
    };

    this.roomsById.set(updatePlayerProfilePayload.roomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public awardTt(
    socketId: string,
    awardTtPayload: AwardTtPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, awardTtPayload.roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_AWARD_TT");
    }

    if (!roomRecord.roomState.players.some((p) => p.id === awardTtPayload.playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const nextGameState = roomRecord.gameState
      ? this.gameFlowService.awardTtTokens(
          roomRecord.gameState,
          awardTtPayload.playerId,
          awardTtPayload.amount,
        )
      : null;
    const nextRoomState = nextGameState
      ? mapGameStateToPublicRoomState(
          roomRecord.roomState,
          nextGameState,
          roomRecord.trackCardsById,
        )
      : {
          ...roomRecord.roomState,
          players: roomRecord.roomState.players.map((player) =>
            player.id === awardTtPayload.playerId
              ? {
                  ...player,
                  ttTokenCount: Math.max(
                    0,
                    Math.min(
                      MAX_STARTING_TT_TOKEN_COUNT,
                      player.ttTokenCount + awardTtPayload.amount,
                    ),
                  ),
                }
              : player,
          ),
        };

    this.roomsById.set(awardTtPayload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public skipTrackWithTt(
    socketId: string,
    skipTrackWithTtPayload: SkipTrackWithTtPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(
      socketId,
      skipTrackWithTtPayload.roomId,
    );
    const membership = this.getMembership(socketId);

    if (!roomRecord.roomState.settings.ttModeEnabled) {
      throw new Error("TT_MODE_DISABLED");
    }

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    const nextGameState = this.gameFlowService.skipCurrentTrackWithTt(
      roomRecord.gameState,
      membership.playerId,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(skipTrackWithTtPayload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public buyTimelineCardWithTt(
    socketId: string,
    buyTimelineCardWithTtPayload: BuyTimelineCardWithTtPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(
      socketId,
      buyTimelineCardWithTtPayload.roomId,
    );
    const membership = this.getMembership(socketId);

    if (!roomRecord.roomState.settings.ttModeEnabled) {
      throw new Error("TT_MODE_DISABLED");
    }

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    const nextGameState = this.gameFlowService.buyTimelineCardWithTt(
      roomRecord.gameState,
      membership.playerId,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(buyTimelineCardWithTtPayload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public skipTurn(
    socketId: string,
    skipTurnPayload: { roomId: RoomId },
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, skipTurnPayload.roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_SKIP_TURN");
    }

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    if (roomRecord.gameState.phase !== "turn") {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    const nextGameState = this.gameFlowService.skipOfflinePlayerTurn(
      roomRecord.gameState,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(skipTurnPayload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public startGame(
    socketId: string,
    startGamePayload: StartGamePayloadParsed,
    deckCards: GameTrackCard[],
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, startGamePayload.roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_START_GAME");
    }

    if (roomRecord.roomState.status !== "lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }

    const gameState = this.gameFlowService.startGame({
      players: roomRecord.roomState.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        startingTimelineCardCount: player.startingTimelineCardCount,
        startingTtTokenCount: player.ttTokenCount,
      })),
      deck: deckCards,
      targetTimelineCardCount:
        roomRecord.roomState.settings.targetTimelineCardCount,
    });
    const trackCardsById = createTrackCardMap(deckCards);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      trackCardsById,
    );

    this.roomsById.set(startGamePayload.roomId, {
      gameState,
      roomState,
      trackCardsById,
      importedDeck: roomRecord.importedDeck,
    });
    return roomState;
  }

  public getRoomStateForMember(socketId: string, roomId: RoomId): PublicRoomState {
    return this.getRoomRecordForMember(socketId, roomId).roomState;
  }

  public setImportedDeck(
    socketId: string,
    roomId: RoomId,
    deck: GameTrackCard[],
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_IMPORT_PLAYLIST");
    }

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      settings: {
        ...roomRecord.roomState.settings,
        playlistImported: true,
        importedTrackCount: deck.length,
      },
    };

    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: deck,
    });
    return nextRoomState;
  }

  public setSpotifyAuthStatus(
    socketId: string,
    roomId: RoomId,
    status: "none" | "connected",
    accountType: SpotifyAccountType | null,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_SET_SPOTIFY_AUTH");
    }

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      settings: {
        ...roomRecord.roomState.settings,
        spotifyAuthStatus: status,
        spotifyAccountType: accountType,
      },
    };

    this.roomsById.set(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public getImportedDeck(roomId: RoomId): GameTrackCard[] | null {
    return this.roomsById.get(roomId)?.importedDeck ?? null;
  }

  public removeTracksFromImportedDeck(
    socketId: string,
    roomId: RoomId,
    trackIds: string[],
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_EDIT_PLAYLIST");
    }

    if (!roomRecord.importedDeck) {
      throw new Error("NO_PLAYLIST_IMPORTED");
    }

    const removeSet = new Set(trackIds);
    const nextDeck = roomRecord.importedDeck.filter((card) => !removeSet.has(card.id));

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      settings: {
        ...roomRecord.roomState.settings,
        importedTrackCount: nextDeck.length,
        playlistImported: nextDeck.length > 0,
      },
    };

    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: nextDeck.length > 0 ? nextDeck : null,
    });
    return nextRoomState;
  }

  public transferHost(
    socketId: string,
    transferHostPayload: TransferHostPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(
      socketId,
      transferHostPayload.roomId,
    );
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_TRANSFER_HOST");
    }

    return this.transferHostToPlayer(
      transferHostPayload.roomId,
      transferHostPayload.playerId,
      { requireConnectedTarget: true },
    );
  }

  public placeCard(
    socketId: string,
    placeCardPayload: PlaceCardPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, placeCardPayload.roomId);
    const membership = this.getMembership(socketId);

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    const gameState = this.gameFlowService.placeCard(
      roomRecord.gameState,
      membership.playerId,
      placeCardPayload.selectedSlotIndex,
      {
        challengeEnabled: roomRecord.roomState.settings.ttModeEnabled,
        challengeDeadlineEpochMs:
          roomRecord.roomState.settings.ttModeEnabled &&
          roomRecord.roomState.settings.challengeWindowDurationSeconds !== null
            ? Date.now() +
              roomRecord.roomState.settings.challengeWindowDurationSeconds * 1000
            : null,
      },
    );
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(placeCardPayload.roomId, { ...roomRecord, gameState, roomState });
    this.scheduleChallengeAutoResolve(placeCardPayload.roomId, gameState);
    return roomState;
  }

  public claimChallenge(
    socketId: string,
    claimChallengePayload: ClaimChallengePayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, claimChallengePayload.roomId);
    const membership = this.getMembership(socketId);

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    this.assertChallengeWindowStillOpen(roomRecord.gameState);

    const gameState = this.gameFlowService.claimChallenge(
      roomRecord.gameState,
      membership.playerId,
    );
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(claimChallengePayload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(claimChallengePayload.roomId);
    return roomState;
  }

  public placeChallenge(
    socketId: string,
    placeChallengePayload: PlaceChallengePayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, placeChallengePayload.roomId);
    const membership = this.getMembership(socketId);

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    const gameState = this.gameFlowService.placeChallengeCard(
      roomRecord.gameState,
      membership.playerId,
      placeChallengePayload.selectedSlotIndex,
    );
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(placeChallengePayload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(placeChallengePayload.roomId);
    return roomState;
  }

  public resolveChallengeWindow(
    socketId: string,
    resolveChallengeWindowPayload: ResolveChallengeWindowPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(
      socketId,
      resolveChallengeWindowPayload.roomId,
    );
    const membership = this.getMembership(socketId);

    if (!roomRecord.gameState) {
      throw new Error("GAME_NOT_STARTED");
    }

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    ) {
      throw new Error("ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW");
    }

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn?.activePlayerId !== membership.playerId
    ) {
      throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_RESOLVE_CHALLENGE_WINDOW");
    }

    const gameState = this.gameFlowService.resolveChallengeWindow(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(resolveChallengeWindowPayload.roomId, {
      ...roomRecord,
      gameState,
      roomState,
    });
    this.challengeTimers.clear(resolveChallengeWindowPayload.roomId);
    return roomState;
  }

  public confirmReveal(
    socketId: string,
    confirmRevealPayload: ConfirmRevealPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(
      socketId,
      confirmRevealPayload.roomId,
    );
    const membership = this.getMembership(socketId);

    if (!roomRecord.gameState || !roomRecord.gameState.turn) {
      throw new Error("GAME_NOT_STARTED");
    }

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    ) {
      throw new Error("ONLY_HOST_CAN_CONFIRM_REVEAL");
    }

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn.activePlayerId !== membership.playerId
    ) {
      throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_CONFIRM_REVEAL");
    }

    const gameState = this.gameFlowService.confirmReveal(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(confirmRevealPayload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(confirmRevealPayload.roomId);
    return roomState;
  }

  public closeRoom(
    socketId: string,
    closeRoomPayload: CloseRoomPayloadParsed,
  ): RoomId {
    const roomRecord = this.getRoomRecordForMember(socketId, closeRoomPayload.roomId);
    const membership = this.getMembership(socketId);

    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_CLOSE_ROOM");
    }

    for (const [sessionId, sessionMembership] of this.sessionMemberships.entries()) {
      if (sessionMembership.roomId === closeRoomPayload.roomId) {
        this.disconnectTimers.clear(sessionId);
        this.sessionMemberships.delete(sessionId);
      }
    }

    for (const [memberSocketId, socketMembership] of this.socketMemberships.entries()) {
      if (socketMembership.roomId === closeRoomPayload.roomId) {
        this.socketMemberships.delete(memberSocketId);
      }
    }

    this.challengeTimers.clear(closeRoomPayload.roomId);
    this.roomsById.delete(closeRoomPayload.roomId);

    return closeRoomPayload.roomId;
  }

  public removePlayerBySocketId(socketId: string): PublicRoomState | null {
    const membership = this.socketMemberships.get(socketId);

    if (!membership) return null;

    this.socketMemberships.delete(socketId);
    const roomState = this.markPlayerDisconnected(membership);

    if (roomState?.status === "lobby") {
      this.disconnectTimers.schedule(membership.sessionId, this.reconnectGracePeriodMs, () => {
        const nextRoomState = this.removePlayerBySessionId(membership.sessionId);
        if (nextRoomState) {
          this.roomStateChangedListener?.(nextRoomState);
        }
      });
    }

    return roomState;
  }

  // ─── Private: session management ─────────────────────────────────────────

  private restorePlayerSession(
    roomId: RoomId,
    playerId: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    this.disconnectTimers.clear(sessionId);

    const roomRecord = this.roomsById.get(roomId);

    if (!roomRecord) {
      this.sessionMemberships.delete(sessionId);
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    if (!roomRecord.roomState.players.find((p) => p.id === playerId)) {
      this.sessionMemberships.delete(sessionId);
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    const connectedRoomState = this.markPlayerConnected(roomId, playerId);
    this.socketMemberships.set(socketId, { playerId, roomId, sessionId });

    return { playerId, roomState: connectedRoomState };
  }

  private removePlayerBySessionId(sessionId: string): PublicRoomState | null {
    const membership = this.sessionMemberships.get(sessionId);
    if (!membership) return null;

    this.sessionMemberships.delete(sessionId);
    const roomRecord = this.roomsById.get(membership.roomId);
    if (!roomRecord) return null;

    const players = roomRecord.roomState.players.filter(
      (p) => p.id !== membership.playerId,
    );
    const timelines = { ...roomRecord.roomState.timelines };
    delete timelines[membership.playerId];

    if (players.length === 0) {
      this.challengeTimers.clear(membership.roomId);
      this.roomsById.delete(membership.roomId);
      return null;
    }

    const hostId =
      roomRecord.roomState.hostId === membership.playerId
        ? (players[0]?.id ?? roomRecord.roomState.hostId)
        : roomRecord.roomState.hostId;

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      hostId,
      players: players.map((p) => ({ ...p, isHost: p.id === hostId })),
      timelines,
    };

    this.roomsById.set(membership.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  // ─── Private: player connection ───────────────────────────────────────────

  private markPlayerDisconnected(
    membership: SocketRoomMembership,
  ): PublicRoomState | null {
    const roomRecord = this.roomsById.get(membership.roomId);
    if (!roomRecord) return null;

    const disconnectedAtEpochMs = Date.now();
    const reconnectExpiresAtEpochMs =
      disconnectedAtEpochMs + this.reconnectGracePeriodMs;

    const disconnectedRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      players: roomRecord.roomState.players.map((player) =>
        player.id === membership.playerId
          ? {
              ...player,
              connectionStatus: "disconnected",
              disconnectedAtEpochMs,
              reconnectExpiresAtEpochMs,
            }
          : player,
      ),
    };

    this.roomsById.set(membership.roomId, {
      ...roomRecord,
      roomState: disconnectedRoomState,
    });

    let nextRoomState = disconnectedRoomState;

    if (disconnectedRoomState.hostId === membership.playerId) {
      const candidate = this.selectAutomaticHostCandidate(disconnectedRoomState);
      if (candidate) {
        nextRoomState = this.transferHostToPlayer(membership.roomId, candidate.id, {
          requireConnectedTarget: true,
        });
      }
    }

    return (
      this.advanceTurnIfDisconnectedActivePlayer(
        membership.roomId,
        membership.playerId,
      ) ?? nextRoomState
    );
  }

  private markPlayerConnected(roomId: RoomId, playerId: string): PublicRoomState {
    const roomRecord = this.roomsById.get(roomId);
    if (!roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");

    const connectedRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      players: roomRecord.roomState.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              connectionStatus: "connected",
              disconnectedAtEpochMs: null,
              reconnectExpiresAtEpochMs: null,
            }
          : player,
      ),
    };

    this.roomsById.set(roomId, { ...roomRecord, roomState: connectedRoomState });

    const currentHost = connectedRoomState.players.find(
      (p) => p.id === connectedRoomState.hostId,
    );

    if (currentHost?.connectionStatus !== "disconnected") {
      return connectedRoomState;
    }

    const candidate = this.selectAutomaticHostCandidate(connectedRoomState);
    if (!candidate) return connectedRoomState;

    return this.transferHostToPlayer(roomId, candidate.id, {
      requireConnectedTarget: true,
    });
  }

  private advanceTurnIfDisconnectedActivePlayer(
    roomId: RoomId,
    disconnectedPlayerId: string,
  ): PublicRoomState | null {
    const roomRecord = this.roomsById.get(roomId);

    if (
      !roomRecord?.gameState ||
      roomRecord.gameState.phase !== "turn" ||
      roomRecord.gameState.turn?.activePlayerId !== disconnectedPlayerId
    ) {
      return null;
    }

    const nextActivePlayer = this.selectNextConnectedTurnPlayer(
      roomRecord.roomState,
      disconnectedPlayerId,
    );
    if (!nextActivePlayer) return null;

    const nextGameState = this.gameFlowService.advanceTurnToPlayer(
      roomRecord.gameState,
      nextActivePlayer.id,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );

    this.roomsById.set(roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  private selectNextConnectedTurnPlayer(
    roomState: PublicRoomState,
    currentActivePlayerId: string,
  ): PublicPlayerState | null {
    const currentIndex = roomState.players.findIndex(
      (p) => p.id === currentActivePlayerId,
    );
    if (currentIndex === -1) return null;

    for (let offset = 1; offset < roomState.players.length; offset += 1) {
      const candidate =
        roomState.players[(currentIndex + offset) % roomState.players.length];
      if (candidate?.connectionStatus === "connected") return candidate;
    }
    return null;
  }

  // ─── Private: host management ─────────────────────────────────────────────

  private transferHostToPlayer(
    roomId: RoomId,
    targetPlayerId: string,
    options: { requireConnectedTarget: boolean },
  ): PublicRoomState {
    const roomRecord = this.roomsById.get(roomId);
    if (!roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");

    const targetPlayer = roomRecord.roomState.players.find(
      (p) => p.id === targetPlayerId,
    );
    if (!targetPlayer) throw new Error("HOST_TRANSFER_TARGET_NOT_FOUND");
    if (roomRecord.roomState.hostId === targetPlayerId) {
      throw new Error("HOST_TRANSFER_TARGET_IS_ALREADY_HOST");
    }
    if (options.requireConnectedTarget && targetPlayer.connectionStatus !== "connected") {
      throw new Error("HOST_TRANSFER_TARGET_DISCONNECTED");
    }

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      hostId: targetPlayerId,
      players: roomRecord.roomState.players.map((p) => ({
        ...p,
        isHost: p.id === targetPlayerId,
      })),
    };

    this.roomsById.set(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  private selectAutomaticHostCandidate(
    roomState: PublicRoomState,
  ): PublicPlayerState | null {
    return (
      roomState.players.find(
        (p) => p.id !== roomState.hostId && p.connectionStatus === "connected",
      ) ?? null
    );
  }

  // ─── Private: challenge timer ─────────────────────────────────────────────

  private scheduleChallengeAutoResolve(roomId: RoomId, gameState: GameState): void {
    if (
      gameState.phase !== "challenge" ||
      !gameState.challengeState?.challengeDeadlineEpochMs
    ) {
      this.challengeTimers.clear(roomId);
      return;
    }

    const delayMs = Math.max(
      0,
      gameState.challengeState.challengeDeadlineEpochMs - Date.now(),
    );

    this.challengeTimers.schedule(roomId, delayMs, () => {
      const roomRecord = this.roomsById.get(roomId);
      if (!roomRecord?.gameState) return;

      if (
        roomRecord.gameState.phase !== "challenge" ||
        !roomRecord.gameState.challengeState ||
        roomRecord.gameState.challengeState.challengerPlayerId ||
        !this.isChallengeDeadlineExpired(roomRecord.gameState)
      ) {
        return;
      }

      const nextGameState = this.gameFlowService.resolveChallengeWindow(
        roomRecord.gameState,
      );
      const nextRoomState = mapGameStateToPublicRoomState(
        roomRecord.roomState,
        nextGameState,
        roomRecord.trackCardsById,
      );

      this.roomsById.set(roomId, {
        ...roomRecord,
        gameState: nextGameState,
        roomState: nextRoomState,
      });
      this.roomStateChangedListener?.(nextRoomState);
    });
  }

  private assertChallengeWindowStillOpen(gameState: GameState): void {
    if (this.isChallengeDeadlineExpired(gameState)) {
      throw new Error("CHALLENGE_WINDOW_EXPIRED");
    }
  }

  private isChallengeDeadlineExpired(gameState: GameState): boolean {
    if (
      gameState.phase !== "challenge" ||
      !gameState.challengeState?.challengeDeadlineEpochMs
    ) {
      return false;
    }
    return Date.now() >= gameState.challengeState.challengeDeadlineEpochMs;
  }

  // ─── Private: membership helpers ─────────────────────────────────────────

  private getMembership(socketId: string): SocketRoomMembership {
    const membership = this.socketMemberships.get(socketId);
    if (!membership) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    return membership;
  }

  private getRoomRecordForMember(socketId: string, roomId: RoomId): RoomRecord {
    const membership = this.getMembership(socketId);
    const roomRecord = this.roomsById.get(roomId);
    if (membership.roomId !== roomId || !roomRecord) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }
    return roomRecord;
  }
}
