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
  type ConfirmRevealPayloadParsed,
  type PlaceChallengePayloadParsed,
  type PlaceCardPayloadParsed,
  type PublicRoomState,
  type RenameRoomPayloadParsed,
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
import {
  buildConnectedRoomState,
  buildDisconnectedRoomState,
  buildHostTransferredRoomState,
  buildPlayerRemovedRoomState,
  selectAutomaticHostCandidate,
  selectNextConnectedTurnPlayer,
} from "./roomConnectionBuilders.js";
import {
  buildAwardedTtLobbyRoomState,
  buildImportedDeckRoomState,
  buildInitialRoomState,
  buildPlayerJoinedRoomState,
  buildRenamedRoomState,
  buildRemovedTracksRoomState,
  buildSpotifyAuthRoomState,
  buildUpdatedPlayerSettingsRoomState,
  buildUpdatedProfileRoomState,
  buildUpdatedSettingsRoomState,
} from "./roomLobbyBuilders.js";
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

export interface KickPlayerResult {
  kickedSocketIds: string[];
  roomState: PublicRoomState;
}

export class RoomRegistry {
  private static readonly MAX_ACTIVE_ROOM_COUNT = 5;
  private static readonly DEFAULT_RECONNECT_GRACE_PERIOD_MS = 30_000;
  private static readonly DEFAULT_HOST_TRANSFER_GRACE_PERIOD_MS = 15_000;
  private static readonly DEFAULT_TURN_SKIP_GRACE_PERIOD_MS = 60_000;
  private static readonly IN_GAME_RECONNECT_DISPLAY_MS = 180_000;

  private readonly roomsById = new Map<RoomId, RoomRecord>();
  private readonly roomRedirectsById = new Map<RoomId, RoomId>();
  private readonly socketMemberships = new Map<string, SocketRoomMembership>();
  private readonly sessionMemberships = new Map<string, SessionRoomMembership>();
  private readonly challengeTimers = new ChallengeTimerManager();
  private readonly disconnectTimers = new DisconnectTimerManager();
  private readonly hostTransferTimers = new DisconnectTimerManager();
  private readonly turnSkipTimers = new DisconnectTimerManager();
  private roomStateChangedListener: ((roomState: PublicRoomState) => void) | null = null;

  public constructor(
    private readonly gameFlowService = new GameFlowService(),
    private readonly reconnectGracePeriodMs = RoomRegistry.DEFAULT_RECONNECT_GRACE_PERIOD_MS,
    private readonly hostTransferGracePeriodMs = RoomRegistry.DEFAULT_HOST_TRANSFER_GRACE_PERIOD_MS,
    private readonly turnSkipGracePeriodMs = RoomRegistry.DEFAULT_TURN_SKIP_GRACE_PERIOD_MS,
  ) {}

  public setRoomStateChangedListener(
    listener: (roomState: PublicRoomState) => void,
  ): void {
    this.roomStateChangedListener = listener;
  }

  // ─── Lobby: join & leave ──────────────────────────────────────────────────

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

    if (
      existingSessionMembership &&
      !existingRoomRecord &&
      this.roomRedirectsById.get(roomId) === existingSessionMembership.roomId
    ) {
      const restoredExistingRoom = this.tryRestoreExistingSessionRoom(
        existingSessionMembership,
        socketId,
        sessionId,
      );
      if (restoredExistingRoom) return restoredExistingRoom;
    }

    if (existingSessionMembership) {
      const previousRoomState = this.removePlayerBySessionId(sessionId);
      if (previousRoomState) {
        this.roomStateChangedListener?.(previousRoomState);
      }
    }

    const playerId = randomUUID();

    if (!existingRoomRecord) {
      if (this.roomsById.size >= RoomRegistry.MAX_ACTIVE_ROOM_COUNT) {
        throw new Error("ROOM_LIMIT_REACHED");
      }

      const roomState = buildInitialRoomState(roomId, playerId, displayName);
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

    const nextRoomState = buildPlayerJoinedRoomState(
      existingRoomRecord.roomState,
      playerId,
      displayName,
    );
    this.roomsById.set(roomId, { ...existingRoomRecord, roomState: nextRoomState });
    this.socketMemberships.set(socketId, { playerId, roomId, sessionId });
    this.sessionMemberships.set(sessionId, { playerId, roomId });
    return { playerId, roomState: nextRoomState };
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

  // ─── Lobby: settings & profile ────────────────────────────────────────────

  public updateRoomSettings(
    socketId: string,
    roomId: RoomId,
    payload: UpdateRoomSettingsPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS");
    }

    const nextRoomState = buildUpdatedSettingsRoomState(roomRecord.roomState, payload);
    this.roomsById.set(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public renameRoom(
    socketId: string,
    payload: RenameRoomPayloadParsed,
  ): { previousRoomId: RoomId; roomState: PublicRoomState } {
    if (payload.roomId === payload.nextRoomId) {
      return {
        previousRoomId: payload.roomId,
        roomState: this.getRoomRecordForMember(socketId, payload.roomId).roomState,
      };
    }

    if (this.roomsById.has(payload.nextRoomId)) {
      throw new Error("ROOM_ALREADY_EXISTS");
    }

    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_RENAME_ROOM");
    }
    if (roomRecord.roomState.status !== "lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }

    const nextRoomState = buildRenamedRoomState(roomRecord.roomState, payload.nextRoomId);
    this.roomsById.delete(payload.roomId);
    this.retargetRoomRedirects(payload.roomId, payload.nextRoomId);
    this.roomRedirectsById.set(payload.roomId, payload.nextRoomId);
    this.roomsById.set(payload.nextRoomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });

    for (const [memberSocketId, socketMembership] of this.socketMemberships) {
      if (socketMembership.roomId === payload.roomId) {
        this.socketMemberships.set(memberSocketId, {
          ...socketMembership,
          roomId: payload.nextRoomId,
        });
      }
    }
    for (const [sessionId, sessionMembership] of this.sessionMemberships) {
      if (sessionMembership.roomId === payload.roomId) {
        this.sessionMemberships.set(sessionId, {
          ...sessionMembership,
          roomId: payload.nextRoomId,
        });
      }
    }

    return { previousRoomId: payload.roomId, roomState: nextRoomState };
  }

  public updatePlayerSettings(
    socketId: string,
    payload: UpdatePlayerSettingsPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS");
    }
    if (!roomRecord.roomState.players.some((p) => p.id === payload.playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const nextRoomState = buildUpdatedPlayerSettingsRoomState(roomRecord.roomState, payload);
    this.roomsById.set(payload.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public updatePlayerProfile(
    socketId: string,
    payload: UpdatePlayerProfilePayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.status !== "lobby") throw new Error("GAME_ALREADY_STARTED");

    const nextRoomState = buildUpdatedProfileRoomState(
      roomRecord.roomState,
      membership.playerId,
      payload.displayName,
    );
    this.roomsById.set(payload.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  // ─── Lobby: tokens & deck ─────────────────────────────────────────────────

  public awardTt(socketId: string, payload: AwardTtPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_AWARD_TT");
    if (!roomRecord.roomState.players.some((p) => p.id === payload.playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const nextGameState = roomRecord.gameState
      ? this.gameFlowService.awardTtTokens(roomRecord.gameState, payload.playerId, payload.amount)
      : null;
    const nextRoomState = nextGameState
      ? mapGameStateToPublicRoomState(roomRecord.roomState, nextGameState, roomRecord.trackCardsById)
      : buildAwardedTtLobbyRoomState(roomRecord.roomState, payload.playerId, payload.amount);

    this.roomsById.set(payload.roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
    return nextRoomState;
  }

  public setImportedDeck(socketId: string, roomId: RoomId, deck: GameTrackCard[]): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_IMPORT_PLAYLIST");

    const nextRoomState = buildImportedDeckRoomState(roomRecord.roomState, deck);
    this.roomsById.set(roomId, { ...roomRecord, roomState: nextRoomState, importedDeck: deck });
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
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_SET_SPOTIFY_AUTH");

    const nextRoomState = buildSpotifyAuthRoomState(roomRecord.roomState, status, accountType);
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
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_EDIT_PLAYLIST");
    if (!roomRecord.importedDeck) throw new Error("NO_PLAYLIST_IMPORTED");

    const removeSet = new Set(trackIds);
    const nextDeck = roomRecord.importedDeck.filter((card) => !removeSet.has(card.id));
    const nextRoomState = buildRemovedTracksRoomState(roomRecord.roomState, nextDeck);
    this.roomsById.set(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: nextDeck.length > 0 ? nextDeck : null,
    });
    return nextRoomState;
  }

  // ─── Lobby: host management ───────────────────────────────────────────────

  public transferHost(socketId: string, payload: TransferHostPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_TRANSFER_HOST");
    return this.applyHostTransfer(payload.roomId, payload.playerId, { requireConnectedTarget: true });
  }

  public getRoomStateForMember(socketId: string, roomId: RoomId): PublicRoomState {
    return this.getRoomRecordForMember(socketId, roomId).roomState;
  }

  // ─── Gameplay: game lifecycle ─────────────────────────────────────────────

  public startGame(
    socketId: string,
    payload: StartGamePayloadParsed,
    deckCards: GameTrackCard[],
  ): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_START_GAME");
    if (roomRecord.roomState.status !== "lobby") throw new Error("GAME_ALREADY_STARTED");

    const gameState = this.gameFlowService.startGame({
      players: roomRecord.roomState.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        startingTimelineCardCount: player.startingTimelineCardCount,
        startingTtTokenCount: player.ttTokenCount,
      })),
      deck: deckCards,
      targetTimelineCardCount: roomRecord.roomState.settings.targetTimelineCardCount,
    });
    const trackCardsById = createTrackCardMap(deckCards);
    const roomState = mapGameStateToPublicRoomState(roomRecord.roomState, gameState, trackCardsById);
    this.roomsById.set(payload.roomId, { gameState, roomState, trackCardsById, importedDeck: roomRecord.importedDeck });
    return roomState;
  }

  public closeRoom(socketId: string, payload: CloseRoomPayloadParsed): RoomId {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_CLOSE_ROOM");

    for (const [sessionId, sessionMembership] of this.sessionMemberships.entries()) {
      if (sessionMembership.roomId === payload.roomId) {
        this.disconnectTimers.clear(sessionId);
        this.sessionMemberships.delete(sessionId);
      }
    }
    for (const [memberSocketId, socketMembership] of this.socketMemberships.entries()) {
      if (socketMembership.roomId === payload.roomId) {
        this.socketMemberships.delete(memberSocketId);
      }
    }
    this.challengeTimers.clear(payload.roomId);
    this.roomsById.delete(payload.roomId);
    this.clearRoomRedirects(payload.roomId);
    return payload.roomId;
  }

  // ─── Gameplay: turn actions ───────────────────────────────────────────────

  public skipTurn(socketId: string, payload: { roomId: RoomId }): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_SKIP_TURN");
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    const phase = roomRecord.gameState.phase;
    const isChallengeClaimedSkip =
      phase === "challenge" &&
      roomRecord.gameState.challengeState?.phase === "claimed";

    if (phase !== "turn" && !isChallengeClaimedSkip) throw new Error("GAME_NOT_IN_TURN_PHASE");

    if (phase === "turn") {
      const activeSessionId = this.findSessionIdForPlayer(
        payload.roomId,
        roomRecord.gameState.turn?.activePlayerId ?? "",
      );
      if (activeSessionId) this.turnSkipTimers.clear(activeSessionId);
    }

    if (isChallengeClaimedSkip) {
      const challengerSessionId = this.findSessionIdForPlayer(
        payload.roomId,
        roomRecord.gameState.challengeState!.challengerPlayerId ?? "",
      );
      if (challengerSessionId) this.turnSkipTimers.clear(challengerSessionId);
    }

    const nextGameState = isChallengeClaimedSkip
      ? this.gameFlowService.cancelClaimedChallengeForOfflineChallenger(roomRecord.gameState)
      : this.gameFlowService.skipOfflinePlayerTurn(roomRecord.gameState);
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
    return nextRoomState;
  }

  public skipTrackWithTt(socketId: string, payload: SkipTrackWithTtPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.roomState.settings.ttModeEnabled) throw new Error("TT_MODE_DISABLED");
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    const nextGameState = this.gameFlowService.skipCurrentTrackWithTt(roomRecord.gameState, membership.playerId);
    const nextRoomState = mapGameStateToPublicRoomState(roomRecord.roomState, nextGameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
    return nextRoomState;
  }

  public buyTimelineCardWithTt(socketId: string, payload: BuyTimelineCardWithTtPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.roomState.settings.ttModeEnabled) throw new Error("TT_MODE_DISABLED");
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    const nextGameState = this.gameFlowService.buyTimelineCardWithTt(roomRecord.gameState, membership.playerId);
    const nextRoomState = mapGameStateToPublicRoomState(roomRecord.roomState, nextGameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
    return nextRoomState;
  }

  // ─── Gameplay: card placement & challenge ─────────────────────────────────

  public placeCard(socketId: string, payload: PlaceCardPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    const gameState = this.gameFlowService.placeCard(
      roomRecord.gameState,
      membership.playerId,
      payload.selectedSlotIndex,
      {
        challengeEnabled: roomRecord.roomState.settings.ttModeEnabled,
        challengeDeadlineEpochMs:
          roomRecord.roomState.settings.ttModeEnabled &&
          roomRecord.roomState.settings.challengeWindowDurationSeconds !== null
            ? Date.now() + roomRecord.roomState.settings.challengeWindowDurationSeconds * 1000
            : null,
      },
    );
    const roomState = mapGameStateToPublicRoomState(roomRecord.roomState, gameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState, roomState });
    this.scheduleChallengeAutoResolve(payload.roomId, gameState);
    return roomState;
  }

  public claimChallenge(socketId: string, payload: ClaimChallengePayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");
    this.assertChallengeWindowStillOpen(roomRecord.gameState);

    const gameState = this.gameFlowService.claimChallenge(roomRecord.gameState, membership.playerId);
    const roomState = mapGameStateToPublicRoomState(roomRecord.roomState, gameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(payload.roomId);
    return roomState;
  }

  public placeChallenge(socketId: string, payload: PlaceChallengePayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    const gameState = this.gameFlowService.placeChallengeCard(
      roomRecord.gameState,
      membership.playerId,
      payload.selectedSlotIndex,
    );
    const roomState = mapGameStateToPublicRoomState(roomRecord.roomState, gameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(payload.roomId);
    return roomState;
  }

  public resolveChallengeWindow(socketId: string, payload: ResolveChallengeWindowPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    ) throw new Error("ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn?.activePlayerId !== membership.playerId
    ) throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_RESOLVE_CHALLENGE_WINDOW");

    const gameState = this.gameFlowService.resolveChallengeWindow(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(roomRecord.roomState, gameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(payload.roomId);
    return roomState;
  }

  public confirmReveal(socketId: string, payload: ConfirmRevealPayloadParsed): PublicRoomState {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (!roomRecord.gameState?.turn) throw new Error("GAME_NOT_STARTED");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    ) throw new Error("ONLY_HOST_CAN_CONFIRM_REVEAL");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn.activePlayerId !== membership.playerId
    ) throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_CONFIRM_REVEAL");

    const gameState = this.gameFlowService.confirmReveal(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(roomRecord.roomState, gameState, roomRecord.trackCardsById);
    this.roomsById.set(payload.roomId, { ...roomRecord, gameState, roomState });
    this.challengeTimers.clear(payload.roomId);
    return roomState;
  }

  // ─── Gameplay: kick player ────────────────────────────────────────────────

  public kickPlayer(socketId: string, payload: { roomId: RoomId; playerId: string }): KickPlayerResult {
    const roomRecord = this.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.getMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) throw new Error("ONLY_HOST_CAN_KICK_PLAYER");
    if (payload.playerId === membership.playerId) throw new Error("CANNOT_KICK_YOURSELF");
    if (!roomRecord.roomState.players.find((p) => p.id === payload.playerId)) throw new Error("PLAYER_NOT_FOUND");

    const targetSessionId = this.findSessionIdForPlayer(payload.roomId, payload.playerId);
    if (targetSessionId) {
      this.disconnectTimers.clear(targetSessionId);
      this.turnSkipTimers.clear(targetSessionId);
      this.sessionMemberships.delete(targetSessionId);
    }
    const kickedSocketIds: string[] = [];
    for (const [sid, m] of this.socketMemberships) {
      if (m.roomId === payload.roomId && m.playerId === payload.playerId) {
        kickedSocketIds.push(sid);
        this.socketMemberships.delete(sid);
      }
    }

    const isActivePlayer =
      !!roomRecord.gameState &&
      roomRecord.gameState.phase === "turn" &&
      roomRecord.gameState.turn?.activePlayerId === payload.playerId;

    let gameState = roomRecord.gameState;
    if (isActivePlayer && gameState) {
      gameState = this.gameFlowService.skipOfflinePlayerTurn(gameState);
    }

    const { nextRoomState: baseRoomState } = buildPlayerRemovedRoomState(roomRecord.roomState, payload.playerId);
    if (!baseRoomState) {
      this.challengeTimers.clear(payload.roomId);
      this.roomsById.delete(payload.roomId);
      throw new Error("ROOM_EMPTY_AFTER_KICK");
    }

    const nextRoomState = gameState
      ? mapGameStateToPublicRoomState(baseRoomState, gameState, roomRecord.trackCardsById)
      : baseRoomState;

    this.roomsById.set(payload.roomId, { ...roomRecord, gameState, roomState: nextRoomState });
    return { kickedSocketIds, roomState: nextRoomState };
  }

  // ─── Private: session management ─────────────────────────────────────────

  private restorePlayerSession(
    roomId: RoomId,
    playerId: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    this.disconnectTimers.clear(sessionId);
    this.turnSkipTimers.clear(sessionId);

    const roomRecord = this.roomsById.get(roomId);
    if (roomRecord?.roomState.hostId === playerId) {
      this.hostTransferTimers.clear(roomId);
    }
    if (!roomRecord || !roomRecord.roomState.players.find((p) => p.id === playerId)) {
      this.sessionMemberships.delete(sessionId);
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    const connectedRoomState = this.markPlayerConnected(roomId, playerId);
    this.socketMemberships.set(socketId, { playerId, roomId, sessionId });
    return { playerId, roomState: connectedRoomState };
  }

  private tryRestoreExistingSessionRoom(
    membership: SessionRoomMembership,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult | null {
    const roomRecord = this.roomsById.get(membership.roomId);
    if (
      !roomRecord ||
      roomRecord.roomState.status !== "lobby" ||
      !roomRecord.roomState.players.some((player) => player.id === membership.playerId)
    ) {
      return null;
    }

    return this.restorePlayerSession(
      membership.roomId,
      membership.playerId,
      socketId,
      sessionId,
    );
  }

  private removePlayerBySessionId(sessionId: string): PublicRoomState | null {
    const membership = this.sessionMemberships.get(sessionId);
    if (!membership) return null;
    this.sessionMemberships.delete(sessionId);

    const roomRecord = this.roomsById.get(membership.roomId);
    if (!roomRecord) return null;

    const { nextRoomState } = buildPlayerRemovedRoomState(roomRecord.roomState, membership.playerId);
    if (!nextRoomState) {
      this.challengeTimers.clear(membership.roomId);
      this.roomsById.delete(membership.roomId);
      this.clearRoomRedirects(membership.roomId);
      return null;
    }

    this.roomsById.set(membership.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  private retargetRoomRedirects(previousRoomId: RoomId, nextRoomId: RoomId): void {
    for (const [sourceRoomId, targetRoomId] of this.roomRedirectsById) {
      if (targetRoomId === previousRoomId) {
        this.roomRedirectsById.set(sourceRoomId, nextRoomId);
      }
    }
  }

  private clearRoomRedirects(roomId: RoomId): void {
    for (const [sourceRoomId, targetRoomId] of this.roomRedirectsById) {
      if (sourceRoomId === roomId || targetRoomId === roomId) {
        this.roomRedirectsById.delete(sourceRoomId);
      }
    }
  }

  // ─── Private: player connection ───────────────────────────────────────────

  private markPlayerDisconnected(membership: SocketRoomMembership): PublicRoomState | null {
    const roomRecord = this.roomsById.get(membership.roomId);
    if (!roomRecord) return null;

    const disconnectedAtEpochMs = Date.now();
    const isGameInProgress = roomRecord.roomState.status !== "lobby";
    const reconnectExpiresAtEpochMs =
      disconnectedAtEpochMs +
      (isGameInProgress ? RoomRegistry.IN_GAME_RECONNECT_DISPLAY_MS : this.reconnectGracePeriodMs);

    const disconnectedRoomState = buildDisconnectedRoomState(
      roomRecord.roomState,
      membership.playerId,
      disconnectedAtEpochMs,
      reconnectExpiresAtEpochMs,
    );
    this.roomsById.set(membership.roomId, { ...roomRecord, roomState: disconnectedRoomState });

    if (
      disconnectedRoomState.status !== "lobby" &&
      disconnectedRoomState.hostId === membership.playerId
    ) {
      this.hostTransferTimers.schedule(membership.roomId, this.hostTransferGracePeriodMs, () => {
        const current = this.roomsById.get(membership.roomId);
        if (!current) return;
        const player = current.roomState.players.find((p) => p.id === membership.playerId);
        if (player?.connectionStatus !== "disconnected" || current.roomState.hostId !== membership.playerId) return;
        const candidate = selectAutomaticHostCandidate(current.roomState);
        if (candidate) {
          const nextState = this.applyHostTransfer(membership.roomId, candidate.id, { requireConnectedTarget: true });
          this.roomStateChangedListener?.(nextState);
        }
      });
    }

    const isActiveTurnPlayer =
      !!roomRecord.gameState &&
      roomRecord.gameState.phase === "turn" &&
      roomRecord.gameState.turn?.activePlayerId === membership.playerId;

    const isChallengeClaimedChallenger =
      !!roomRecord.gameState &&
      roomRecord.gameState.phase === "challenge" &&
      roomRecord.gameState.challengeState?.phase === "claimed" &&
      roomRecord.gameState.challengeState.challengerPlayerId === membership.playerId;

    let effectiveRoomState = disconnectedRoomState;
    if ((isActiveTurnPlayer || isChallengeClaimedChallenger) && disconnectedRoomState.turn) {
      const turnSkipDeadlineEpochMs = disconnectedAtEpochMs + this.turnSkipGracePeriodMs;
      effectiveRoomState = {
        ...disconnectedRoomState,
        turn: { ...disconnectedRoomState.turn, turnSkipDeadlineEpochMs },
      };
      this.roomsById.set(membership.roomId, { ...roomRecord, roomState: effectiveRoomState });
    }

    if (isActiveTurnPlayer) {
      this.turnSkipTimers.schedule(membership.sessionId, this.turnSkipGracePeriodMs, () => {
        const nextState = this.advanceTurnIfDisconnectedActivePlayer(membership.roomId, membership.playerId);
        if (nextState) this.roomStateChangedListener?.(nextState);
      });
    }

    if (isChallengeClaimedChallenger) {
      this.turnSkipTimers.schedule(membership.sessionId, this.turnSkipGracePeriodMs, () => {
        const nextState = this.cancelChallengeIfDisconnectedChallenger(membership.roomId, membership.playerId);
        if (nextState) this.roomStateChangedListener?.(nextState);
      });
    }

    return effectiveRoomState;
  }

  private markPlayerConnected(roomId: RoomId, playerId: string): PublicRoomState {
    const roomRecord = this.roomsById.get(roomId);
    if (!roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");

    const connectedRoomState = buildConnectedRoomState(roomRecord.roomState, playerId);
    this.roomsById.set(roomId, { ...roomRecord, roomState: connectedRoomState });

    const currentHost = connectedRoomState.players.find((p) => p.id === connectedRoomState.hostId);
    if (currentHost?.connectionStatus !== "disconnected") return connectedRoomState;
    if (connectedRoomState.status === "lobby") return connectedRoomState;
    if (this.hostTransferTimers.has(roomId)) return connectedRoomState;

    const candidate = selectAutomaticHostCandidate(connectedRoomState);
    if (!candidate) return connectedRoomState;
    return this.applyHostTransfer(roomId, candidate.id, { requireConnectedTarget: true });
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
    ) return null;

    const nextActivePlayer = selectNextConnectedTurnPlayer(roomRecord.roomState, disconnectedPlayerId);
    if (!nextActivePlayer) return null;

    const nextGameState = this.gameFlowService.advanceTurnToPlayer(roomRecord.gameState, nextActivePlayer.id);
    const nextRoomState = mapGameStateToPublicRoomState(roomRecord.roomState, nextGameState, roomRecord.trackCardsById);
    this.roomsById.set(roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
    return nextRoomState;
  }

  private cancelChallengeIfDisconnectedChallenger(
    roomId: RoomId,
    disconnectedPlayerId: string,
  ): PublicRoomState | null {
    const roomRecord = this.roomsById.get(roomId);
    if (
      !roomRecord?.gameState ||
      roomRecord.gameState.phase !== "challenge" ||
      roomRecord.gameState.challengeState?.phase !== "claimed" ||
      roomRecord.gameState.challengeState.challengerPlayerId !== disconnectedPlayerId
    ) return null;

    const challenger = roomRecord.roomState.players.find((p) => p.id === disconnectedPlayerId);
    if (challenger?.connectionStatus !== "disconnected") return null;

    const nextGameState = this.gameFlowService.cancelClaimedChallengeForOfflineChallenger(roomRecord.gameState);
    const nextRoomState = mapGameStateToPublicRoomState(roomRecord.roomState, nextGameState, roomRecord.trackCardsById);
    this.roomsById.set(roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
    return nextRoomState;
  }

  // ─── Private: host management ─────────────────────────────────────────────

  private applyHostTransfer(
    roomId: RoomId,
    targetPlayerId: string,
    options: { requireConnectedTarget: boolean },
  ): PublicRoomState {
    const roomRecord = this.roomsById.get(roomId);
    if (!roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");

    const targetPlayer = roomRecord.roomState.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) throw new Error("HOST_TRANSFER_TARGET_NOT_FOUND");
    if (roomRecord.roomState.hostId === targetPlayerId) throw new Error("HOST_TRANSFER_TARGET_IS_ALREADY_HOST");
    if (options.requireConnectedTarget && targetPlayer.connectionStatus !== "connected") {
      throw new Error("HOST_TRANSFER_TARGET_DISCONNECTED");
    }

    const nextRoomState = buildHostTransferredRoomState(roomRecord.roomState, targetPlayerId);
    this.roomsById.set(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  private findSessionIdForPlayer(roomId: string, playerId: string): string | undefined {
    for (const [sessionId, membership] of this.sessionMemberships) {
      if (membership.roomId === roomId && membership.playerId === playerId) return sessionId;
    }
    return undefined;
  }

  // ─── Private: challenge timer ─────────────────────────────────────────────

  private scheduleChallengeAutoResolve(roomId: RoomId, gameState: GameState): void {
    if (!gameState.challengeState?.challengeDeadlineEpochMs || gameState.phase !== "challenge") {
      this.challengeTimers.clear(roomId);
      return;
    }

    const delayMs = Math.max(0, gameState.challengeState.challengeDeadlineEpochMs - Date.now());
    this.challengeTimers.schedule(roomId, delayMs, () => {
      const roomRecord = this.roomsById.get(roomId);
      if (!roomRecord?.gameState) return;
      if (
        roomRecord.gameState.phase !== "challenge" ||
        !roomRecord.gameState.challengeState ||
        roomRecord.gameState.challengeState.challengerPlayerId ||
        !this.isChallengeDeadlineExpired(roomRecord.gameState)
      ) return;

      const nextGameState = this.gameFlowService.resolveChallengeWindow(roomRecord.gameState);
      const nextRoomState = mapGameStateToPublicRoomState(
        roomRecord.roomState,
        nextGameState,
        roomRecord.trackCardsById,
      );
      this.roomsById.set(roomId, { ...roomRecord, gameState: nextGameState, roomState: nextRoomState });
      this.roomStateChangedListener?.(nextRoomState);
    });
  }

  private assertChallengeWindowStillOpen(gameState: GameState): void {
    if (this.isChallengeDeadlineExpired(gameState)) throw new Error("CHALLENGE_WINDOW_EXPIRED");
  }

  private isChallengeDeadlineExpired(gameState: GameState): boolean {
    if (!gameState.challengeState?.challengeDeadlineEpochMs || gameState.phase !== "challenge") return false;
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
    if (membership.roomId !== roomId || !roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    return roomRecord;
  }
}
