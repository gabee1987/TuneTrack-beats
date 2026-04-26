import {
  GameFlowService,
  type GameState,
  type GameTrackCard,
  type TimelineCard,
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
  type PublicChallengeState,
  type PublicRoomSettings,
  type PublicRoomState,
  type PublicRevealState,
  type ResolveChallengeWindowPayloadParsed,
  type RoomId,
  type SkipTrackWithTtPayloadParsed,
  type StartGamePayloadParsed,
  type TransferHostPayloadParsed,
  type TimelineCardPublic,
  type TrackCardPublic,
  type UpdatePlayerProfilePayloadParsed,
  type UpdatePlayerSettingsPayloadParsed,
  type UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";

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
  private readonly disconnectTimersBySessionId = new Map<
    string,
    NodeJS.Timeout
  >();
  private readonly challengeTimersByRoomId = new Map<RoomId, NodeJS.Timeout>();
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
      };

      const roomState: PublicRoomState = {
        roomId,
        status: "lobby",
        hostId: playerId,
        players: [playerState],
        timelines: {
          [playerId]: [],
        },
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

      return {
        playerId,
        roomState,
      };
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

    this.roomsById.set(roomId, {
      ...existingRoomRecord,
      roomState: nextRoomState,
    });
    this.socketMemberships.set(socketId, { playerId, roomId, sessionId });
    this.sessionMemberships.set(sessionId, { playerId, roomId });

    return {
      playerId,
      roomState: nextRoomState,
    };
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
              ? {
                  startingTimelineCardCount:
                    roomSettingsPayload.defaultStartingTimelineCardCount,
                }
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

    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });

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

    if (
      !nextPlayers.some(
        (player) => player.id === updatePlayerSettingsPayload.playerId,
      )
    ) {
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

    const hasPlayer = roomRecord.roomState.players.some(
      (player) => player.id === awardTtPayload.playerId,
    );

    if (!hasPlayer) {
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
    const roomRecord = this.getRoomRecordForMember(
      socketId,
      skipTurnPayload.roomId,
    );
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
      },
    };

    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });

    return nextRoomState;
  }

  public getImportedDeck(roomId: RoomId): GameTrackCard[] | null {
    return this.roomsById.get(roomId)?.importedDeck ?? null;
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
      {
        requireConnectedTarget: true,
      },
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

    this.roomsById.set(placeCardPayload.roomId, {
      ...roomRecord,
      gameState,
      roomState,
    });
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

    this.roomsById.set(claimChallengePayload.roomId, {
      ...roomRecord,
      gameState,
      roomState,
    });
    this.clearChallengeTimer(claimChallengePayload.roomId);

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

    this.roomsById.set(placeChallengePayload.roomId, {
      ...roomRecord,
      gameState,
      roomState,
    });
    this.clearChallengeTimer(placeChallengePayload.roomId);

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
      roomRecord.roomState.settings.revealConfirmMode ===
        "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn?.activePlayerId !== membership.playerId
    ) {
      throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_RESOLVE_CHALLENGE_WINDOW");
    }

    const gameState =
      this.gameFlowService.resolveChallengeWindow(roomRecord.gameState);
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
    this.clearChallengeTimer(resolveChallengeWindowPayload.roomId);

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
      roomRecord.roomState.settings.revealConfirmMode ===
        "host_or_active_player" &&
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

    this.roomsById.set(confirmRevealPayload.roomId, {
      ...roomRecord,
      gameState,
      roomState,
    });
    this.clearChallengeTimer(confirmRevealPayload.roomId);

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
        this.clearDisconnectTimer(sessionId);
        this.sessionMemberships.delete(sessionId);
      }
    }

    for (const [memberSocketId, socketMembership] of this.socketMemberships.entries()) {
      if (socketMembership.roomId === closeRoomPayload.roomId) {
        this.socketMemberships.delete(memberSocketId);
      }
    }

    this.clearChallengeTimer(closeRoomPayload.roomId);
    this.roomsById.delete(closeRoomPayload.roomId);

    return closeRoomPayload.roomId;
  }


  public removePlayerBySocketId(socketId: string): PublicRoomState | null {
    const membership = this.socketMemberships.get(socketId);

    if (!membership) {
      return null;
    }

    this.socketMemberships.delete(socketId);
    const roomState = this.markPlayerDisconnected(membership);

    if (roomState?.status === "lobby") {
      this.scheduleDeferredPlayerRemoval(membership.sessionId);
    }

    return roomState;
  }

  private restorePlayerSession(
    roomId: RoomId,
    playerId: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    this.clearDisconnectTimer(sessionId);

    const roomRecord = this.roomsById.get(roomId);

    if (!roomRecord) {
      this.sessionMemberships.delete(sessionId);
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    const existingPlayer = roomRecord.roomState.players.find(
      (player) => player.id === playerId,
    );

    if (!existingPlayer) {
      this.sessionMemberships.delete(sessionId);
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    const connectedRoomState = this.markPlayerConnected(roomId, playerId);
    this.socketMemberships.set(socketId, { playerId, roomId, sessionId });

    return {
      playerId,
      roomState: connectedRoomState,
    };
  }

  private markPlayerDisconnected(
    membership: SocketRoomMembership,
  ): PublicRoomState | null {
    const roomRecord = this.roomsById.get(membership.roomId);

    if (!roomRecord) {
      return null;
    }

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

    const nextRoomRecord: RoomRecord = {
      ...roomRecord,
      roomState: disconnectedRoomState,
    };
    this.roomsById.set(membership.roomId, nextRoomRecord);

    let nextRoomState = disconnectedRoomState;

    if (disconnectedRoomState.hostId === membership.playerId) {
      const automaticHostCandidate = this.selectAutomaticHostCandidate(
        disconnectedRoomState,
      );

      if (automaticHostCandidate) {
        nextRoomState = this.transferHostToPlayer(
          membership.roomId,
          automaticHostCandidate.id,
          {
            requireConnectedTarget: true,
          },
        );
      }
    }

    return (
      this.advanceTurnIfDisconnectedActivePlayer(
        membership.roomId,
        membership.playerId,
      ) ?? nextRoomState
    );
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

    if (!nextActivePlayer) {
      return null;
    }

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
    const currentPlayerIndex = roomState.players.findIndex(
      (player) => player.id === currentActivePlayerId,
    );

    if (currentPlayerIndex === -1) {
      return null;
    }

    for (let offset = 1; offset < roomState.players.length; offset += 1) {
      const candidateIndex = (currentPlayerIndex + offset) % roomState.players.length;
      const candidatePlayer = roomState.players[candidateIndex];

      if (candidatePlayer?.connectionStatus === "connected") {
        return candidatePlayer;
      }
    }

    return null;
  }

  private markPlayerConnected(roomId: RoomId, playerId: string): PublicRoomState {
    const roomRecord = this.roomsById.get(roomId);

    if (!roomRecord) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

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

    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: connectedRoomState,
    });

    const currentHost = connectedRoomState.players.find(
      (player) => player.id === connectedRoomState.hostId,
    );

    if (currentHost?.connectionStatus !== "disconnected") {
      return connectedRoomState;
    }

    const automaticHostCandidate =
      this.selectAutomaticHostCandidate(connectedRoomState);

    if (!automaticHostCandidate) {
      return connectedRoomState;
    }

    return this.transferHostToPlayer(roomId, automaticHostCandidate.id, {
      requireConnectedTarget: true,
    });
  }

  private transferHostToPlayer(
    roomId: RoomId,
    targetPlayerId: string,
    options: { requireConnectedTarget: boolean },
  ): PublicRoomState {
    const roomRecord = this.roomsById.get(roomId);

    if (!roomRecord) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    const targetPlayer = roomRecord.roomState.players.find(
      (player) => player.id === targetPlayerId,
    );

    if (!targetPlayer) {
      throw new Error("HOST_TRANSFER_TARGET_NOT_FOUND");
    }

    if (roomRecord.roomState.hostId === targetPlayerId) {
      throw new Error("HOST_TRANSFER_TARGET_IS_ALREADY_HOST");
    }

    if (
      options.requireConnectedTarget &&
      targetPlayer.connectionStatus !== "connected"
    ) {
      throw new Error("HOST_TRANSFER_TARGET_DISCONNECTED");
    }

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      hostId: targetPlayerId,
      players: this.normalizeHostFlags(
        roomRecord.roomState.players,
        targetPlayerId,
      ),
    };

    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });

    return nextRoomState;
  }

  private selectAutomaticHostCandidate(
    roomState: PublicRoomState,
  ): PublicPlayerState | null {
    return (
      roomState.players.find(
        (player) =>
          player.id !== roomState.hostId &&
          player.connectionStatus === "connected",
      ) ?? null
    );
  }

  private normalizeHostFlags(
    players: PublicPlayerState[],
    hostId: string,
  ): PublicPlayerState[] {
    return players.map((player) => ({
      ...player,
      isHost: player.id === hostId,
    }));
  }

  private scheduleDeferredPlayerRemoval(sessionId: string): void {
    this.clearDisconnectTimer(sessionId);

    const timeoutHandle = setTimeout(() => {
      this.disconnectTimersBySessionId.delete(sessionId);
      const roomState = this.removePlayerBySessionId(sessionId);

      if (roomState) {
        this.roomStateChangedListener?.(roomState);
      }
    }, this.reconnectGracePeriodMs);
    timeoutHandle.unref();

    this.disconnectTimersBySessionId.set(sessionId, timeoutHandle);
  }

  private clearDisconnectTimer(sessionId: string): void {
    const timeoutHandle = this.disconnectTimersBySessionId.get(sessionId);

    if (!timeoutHandle) {
      return;
    }

    clearTimeout(timeoutHandle);
    this.disconnectTimersBySessionId.delete(sessionId);
  }

  private scheduleChallengeAutoResolve(roomId: RoomId, gameState: GameState): void {
    this.clearChallengeTimer(roomId);

    if (
      gameState.phase !== "challenge" ||
      !gameState.challengeState?.challengeDeadlineEpochMs
    ) {
      return;
    }

    const delayMs = Math.max(
      0,
      gameState.challengeState.challengeDeadlineEpochMs - Date.now(),
    );
    const timeoutHandle = setTimeout(() => {
      this.challengeTimersByRoomId.delete(roomId);

      const roomRecord = this.roomsById.get(roomId);

      if (!roomRecord?.gameState) {
        return;
      }

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
    }, delayMs);
    timeoutHandle.unref();

    this.challengeTimersByRoomId.set(roomId, timeoutHandle);
  }

  private clearChallengeTimer(roomId: RoomId): void {
    const timeoutHandle = this.challengeTimersByRoomId.get(roomId);

    if (!timeoutHandle) {
      return;
    }

    clearTimeout(timeoutHandle);
    this.challengeTimersByRoomId.delete(roomId);
  }

  private assertChallengeWindowStillOpen(gameState: GameState): void {
    if (!this.isChallengeDeadlineExpired(gameState)) {
      return;
    }

    throw new Error("CHALLENGE_WINDOW_EXPIRED");
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

  private removePlayerBySessionId(sessionId: string): PublicRoomState | null {
    const membership = this.sessionMemberships.get(sessionId);

    if (!membership) {
      return null;
    }

    this.sessionMemberships.delete(sessionId);

    const roomRecord = this.roomsById.get(membership.roomId);

    if (!roomRecord) {
      return null;
    }

    const players = roomRecord.roomState.players.filter(
      (player) => player.id !== membership.playerId,
    );
    const timelines = { ...roomRecord.roomState.timelines };
    delete timelines[membership.playerId];

    if (players.length === 0) {
      this.clearChallengeTimer(membership.roomId);
      this.roomsById.delete(membership.roomId);
      return null;
    }

    const hostId =
      roomRecord.roomState.hostId === membership.playerId
        ? (players[0]?.id ?? roomRecord.roomState.hostId)
        : roomRecord.roomState.hostId;
    const normalizedPlayers = players.map((player) => ({
      ...player,
      isHost: player.id === hostId,
    }));

    const nextRoomState: PublicRoomState = {
      ...roomRecord.roomState,
      hostId,
      players: normalizedPlayers,
      timelines,
    };

    this.roomsById.set(membership.roomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });

    return nextRoomState;
  }

  private getMembership(socketId: string): SocketRoomMembership {
    const membership = this.socketMemberships.get(socketId);

    if (!membership) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

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

function mapGameStateToPublicRoomState(
  currentRoomState: PublicRoomState,
  gameState: GameState,
  trackCardsById: Map<string, GameTrackCard>,
): PublicRoomState {
  return {
    ...currentRoomState,
    status: gameState.phase,
    players: currentRoomState.players.map((player) => {
      const nextPlayer = gameState.players.find(
        (gamePlayer) => gamePlayer.id === player.id,
      );

      return nextPlayer
        ? {
            ...player,
            ttTokenCount: nextPlayer.ttTokenCount,
          }
        : player;
    }),
    timelines: Object.fromEntries(
      Object.entries(gameState.timelines).map(([playerId, timelineCards]) => [
        playerId,
        timelineCards.map((timelineCard) =>
          mapTimelineCardToPublicTimelineCard(timelineCard, trackCardsById),
        ),
      ]),
    ),
    currentTrackCard: gameState.currentTrackCard
      ? mapTrackCardToPublicTrackCard(gameState.currentTrackCard)
      : null,
    turn: gameState.turn
      ? {
          activePlayerId: gameState.turn.activePlayerId,
          turnNumber: gameState.turn.turnNumber,
          hasUsedSkipTrackWithTt: gameState.turn.hasUsedSkipTrackWithTt,
        }
      : null,
    challengeState: gameState.challengeState
      ? mapChallengeStateToPublicChallengeState(gameState.challengeState)
      : null,
    revealState: gameState.revealState
      ? mapRevealStateToPublicRevealState(gameState.revealState, trackCardsById)
      : null,
    winnerPlayerId: gameState.winnerPlayerId,
  };
}

function mapChallengeStateToPublicChallengeState(
  challengeState: GameState["challengeState"],
): PublicChallengeState | null {
  if (!challengeState) {
    return null;
  }

  return {
    phase: challengeState.phase,
    originalPlayerId: challengeState.originalPlayerId,
    originalSelectedSlotIndex: challengeState.originalSelectedSlotIndex,
    challengerPlayerId: challengeState.challengerPlayerId,
    challengeDeadlineEpochMs: challengeState.challengeDeadlineEpochMs,
    challengerSelectedSlotIndex: challengeState.challengerSelectedSlotIndex,
  };
}

function mapRevealStateToPublicRevealState(
  revealState: GameState["revealState"],
  trackCardsById: Map<string, GameTrackCard>,
): PublicRevealState | null {
  if (!revealState) {
    return null;
  }

  return {
    playerId: revealState.playerId,
    placedCard: mapTimelineCardToPublicTimelineCard(
      revealState.placedCard,
      trackCardsById,
    ),
    selectedSlotIndex: revealState.selectedSlotIndex,
    wasCorrect: revealState.wasCorrect,
    revealType: revealState.revealType,
    validSlotIndexes: revealState.validSlotIndexes,
    challengerPlayerId: revealState.challengerPlayerId,
    challengerSelectedSlotIndex: revealState.challengerSelectedSlotIndex,
    challengeWasSuccessful: revealState.challengeWasSuccessful,
    challengerTtChange: revealState.challengerTtChange,
    awardedPlayerId: revealState.awardedPlayerId,
    awardedSlotIndex: revealState.awardedSlotIndex,
  };
}

function mapTimelineCardToPublicTimelineCard(
  timelineCard: TimelineCard,
  trackCardsById: Map<string, GameTrackCard>,
): TimelineCardPublic {
  const trackCard = trackCardsById.get(timelineCard.id);

  if (!trackCard) {
    throw new Error("TRACK_CARD_NOT_FOUND");
  }

  return {
    ...mapTrackCardToPublicTrackCard(trackCard),
    revealedYear: timelineCard.releaseYear,
  };
}

function mapTrackCardToPublicTrackCard(
  trackCard: GameTrackCard,
): TrackCardPublic {
  return {
    id: trackCard.id,
    title: trackCard.title,
    artist: trackCard.artist,
    albumTitle: trackCard.albumTitle,
    releaseYear: trackCard.releaseYear,
    ...(trackCard.genre ? { genre: trackCard.genre } : {}),
    ...(trackCard.artworkUrl ? { artworkUrl: trackCard.artworkUrl } : {}),
  };
}

function createTrackCardMap(
  deckCards: GameTrackCard[],
): Map<string, GameTrackCard> {
  return new Map(
    deckCards.map((deckCard) => [
      deckCard.id,
      {
        ...deckCard,
      },
    ]),
  );
}
