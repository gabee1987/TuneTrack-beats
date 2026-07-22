import { GameFlowService, type GameState } from "@tunetrack/game-engine";
import type { PublicRoomState, RoomId, TransferHostPayloadParsed } from "@tunetrack/shared";
import {
  buildConnectedRoomState,
  buildDisconnectedRoomState,
  buildHostTransferredRoomState,
  buildPlayerRemovedRoomState,
  selectAutomaticHostCandidate,
  selectNextConnectedTurnPlayer,
} from "./roomConnectionBuilders.js";
import { mapGameStateToPublicRoomState } from "./roomStateMappers.js";
import type {
  JoinRoomResult,
  KickPlayerResult,
  RoomStore,
  SessionRoomMembership,
  SocketRoomMembership,
} from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type RoomStateChangedEmitter = (roomState: PublicRoomState) => void;

export class RoomConnectionService {
  private static readonly IN_GAME_RECONNECT_DISPLAY_MS = 180_000;

  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
  ) {}

  public removePlayerBySocketId(socketId: string): PublicRoomState | null {
    const membership = this.store.getSocketMembership(socketId);
    if (!membership) return null;

    this.store.deleteSocketMembership(socketId);
    const roomState = this.markPlayerDisconnected(membership);

    if (roomState?.status === "lobby") {
      this.timers.scheduleReconnect(
        membership.sessionId,
        this.timers.reconnectGracePeriodMs,
        () => {
          const nextRoomState = this.removePlayerBySessionId(membership.sessionId);
          if (nextRoomState) {
            this.emitRoomStateChanged(nextRoomState);
          }
        },
      );
    }

    return roomState;
  }

  public transferHost(socketId: string, payload: TransferHostPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_TRANSFER_HOST");
    return this.applyHostTransfer(payload.roomId, payload.playerId, {
      requireConnectedTarget: true,
    });
  }

  public kickPlayer(
    socketId: string,
    payload: { roomId: RoomId; playerId: string },
  ): KickPlayerResult {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_KICK_PLAYER");
    if (payload.playerId === membership.playerId) throw new Error("CANNOT_KICK_YOURSELF");
    if (!roomRecord.roomState.players.find((p) => p.id === payload.playerId))
      throw new Error("PLAYER_NOT_FOUND");

    const targetSessionId = this.store.findSessionIdForPlayer(payload.roomId, payload.playerId);
    if (targetSessionId) {
      this.timers.clearForSession(targetSessionId);
      this.store.deleteSessionMembership(targetSessionId);
    }
    const kickedSocketIds = this.store.collectAndClearSocketIdsForPlayer(
      payload.roomId,
      payload.playerId,
    );

    const isActivePlayer =
      !!roomRecord.gameState &&
      roomRecord.gameState.phase === "turn" &&
      roomRecord.gameState.turn?.activePlayerId === payload.playerId;

    let gameState = roomRecord.gameState;
    if (isActivePlayer && gameState) {
      gameState = this.gameFlowService.skipOfflinePlayerTurn(gameState);
    }
    if (gameState) {
      gameState = removePlayerFromGameState(gameState, payload.playerId);
    }

    const { nextRoomState: baseRoomState } = buildPlayerRemovedRoomState(
      roomRecord.roomState,
      payload.playerId,
    );
    if (!baseRoomState) {
      this.timers.clearForRoom(payload.roomId);
      this.store.deleteRoom(payload.roomId);
      throw new Error("ROOM_EMPTY_AFTER_KICK");
    }

    const nextRoomState = gameState
      ? mapGameStateToPublicRoomState(baseRoomState, gameState, roomRecord.trackCardsById)
      : baseRoomState;

    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState: nextRoomState });
    return { kickedSocketIds, roomState: nextRoomState };
  }

  public restorePlayerSession(
    roomId: RoomId,
    playerId: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    this.timers.clearForSession(sessionId);

    const roomRecord = this.store.getRoom(roomId);
    if (roomRecord?.roomState.hostId === playerId) {
      this.timers.clearHostTransfer(roomId);
    }
    if (!roomRecord || !roomRecord.roomState.players.find((p) => p.id === playerId)) {
      this.store.deleteSessionMembership(sessionId);
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    const connectedRoomState = this.markPlayerConnected(roomId, playerId);
    this.store.setSocketMembership(socketId, { playerId, roomId, sessionId });
    return { playerId, roomState: connectedRoomState };
  }

  public tryRestoreExistingSessionRoom(
    membership: SessionRoomMembership,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult | null {
    const roomRecord = this.store.getRoom(membership.roomId);
    if (
      !roomRecord ||
      roomRecord.roomState.status !== "lobby" ||
      !roomRecord.roomState.players.some((player) => player.id === membership.playerId)
    ) {
      return null;
    }

    return this.restorePlayerSession(membership.roomId, membership.playerId, socketId, sessionId);
  }

  public removePlayerBySessionId(sessionId: string): PublicRoomState | null {
    const membership = this.store.getSessionMembership(sessionId);
    if (!membership) return null;
    this.store.deleteSessionMembership(sessionId);

    const roomRecord = this.store.getRoom(membership.roomId);
    if (!roomRecord) return null;

    const { nextRoomState } = buildPlayerRemovedRoomState(
      roomRecord.roomState,
      membership.playerId,
    );
    if (!nextRoomState) {
      this.timers.clearForRoom(membership.roomId);
      this.store.deleteRoom(membership.roomId);
      this.store.clearRoomRedirects(membership.roomId);
      return null;
    }

    this.store.setRoom(membership.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  private markPlayerDisconnected(membership: SocketRoomMembership): PublicRoomState | null {
    const roomRecord = this.store.getRoom(membership.roomId);
    if (!roomRecord) return null;

    const disconnectedAtEpochMs = Date.now();
    const isGameInProgress = roomRecord.roomState.status !== "lobby";
    const reconnectExpiresAtEpochMs =
      disconnectedAtEpochMs +
      (isGameInProgress
        ? RoomConnectionService.IN_GAME_RECONNECT_DISPLAY_MS
        : this.timers.reconnectGracePeriodMs);

    const disconnectedRoomState = buildDisconnectedRoomState(
      roomRecord.roomState,
      membership.playerId,
      disconnectedAtEpochMs,
      reconnectExpiresAtEpochMs,
    );
    this.store.setRoom(membership.roomId, { ...roomRecord, roomState: disconnectedRoomState });

    if (
      disconnectedRoomState.status !== "lobby" &&
      disconnectedRoomState.hostId === membership.playerId
    ) {
      this.timers.scheduleHostTransfer(
        membership.roomId,
        this.timers.hostTransferGracePeriodMs,
        () => {
          const current = this.store.getRoom(membership.roomId);
          if (!current) return;
          const player = current.roomState.players.find((p) => p.id === membership.playerId);
          if (
            player?.connectionStatus !== "disconnected" ||
            current.roomState.hostId !== membership.playerId
          )
            return;
          const candidate = selectAutomaticHostCandidate(current.roomState);
          if (candidate) {
            const nextState = this.applyHostTransfer(membership.roomId, candidate.id, {
              requireConnectedTarget: true,
            });
            this.emitRoomStateChanged(nextState);
          }
        },
      );
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
      const turnSkipDeadlineEpochMs = disconnectedAtEpochMs + this.timers.turnSkipGracePeriodMs;
      effectiveRoomState = {
        ...disconnectedRoomState,
        turn: { ...disconnectedRoomState.turn, turnSkipDeadlineEpochMs },
      };
      this.store.setRoom(membership.roomId, { ...roomRecord, roomState: effectiveRoomState });
    }

    if (isActiveTurnPlayer) {
      this.timers.scheduleTurnSkip(membership.sessionId, this.timers.turnSkipGracePeriodMs, () => {
        const nextState = this.advanceTurnIfDisconnectedActivePlayer(
          membership.roomId,
          membership.playerId,
        );
        if (nextState) this.emitRoomStateChanged(nextState);
      });
    }

    if (isChallengeClaimedChallenger) {
      this.timers.scheduleTurnSkip(membership.sessionId, this.timers.turnSkipGracePeriodMs, () => {
        const nextState = this.cancelChallengeIfDisconnectedChallenger(
          membership.roomId,
          membership.playerId,
        );
        if (nextState) this.emitRoomStateChanged(nextState);
      });
    }

    return effectiveRoomState;
  }

  private markPlayerConnected(roomId: RoomId, playerId: string): PublicRoomState {
    const roomRecord = this.store.getRoom(roomId);
    if (!roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");

    const connectedRoomState = buildConnectedRoomState(roomRecord.roomState, playerId);
    this.store.setRoom(roomId, { ...roomRecord, roomState: connectedRoomState });

    const currentHost = connectedRoomState.players.find((p) => p.id === connectedRoomState.hostId);
    if (currentHost?.connectionStatus !== "disconnected") return connectedRoomState;
    if (connectedRoomState.status === "lobby") return connectedRoomState;
    if (this.timers.hasHostTransfer(roomId)) return connectedRoomState;

    const candidate = selectAutomaticHostCandidate(connectedRoomState);
    if (!candidate) return connectedRoomState;
    return this.applyHostTransfer(roomId, candidate.id, { requireConnectedTarget: true });
  }

  private advanceTurnIfDisconnectedActivePlayer(
    roomId: RoomId,
    disconnectedPlayerId: string,
  ): PublicRoomState | null {
    const roomRecord = this.store.getRoom(roomId);
    if (
      !roomRecord?.gameState ||
      roomRecord.gameState.phase !== "turn" ||
      roomRecord.gameState.turn?.activePlayerId !== disconnectedPlayerId
    )
      return null;

    const nextActivePlayer = selectNextConnectedTurnPlayer(
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
    this.store.setRoom(roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  private cancelChallengeIfDisconnectedChallenger(
    roomId: RoomId,
    disconnectedPlayerId: string,
  ): PublicRoomState | null {
    const roomRecord = this.store.getRoom(roomId);
    if (
      !roomRecord?.gameState ||
      roomRecord.gameState.phase !== "challenge" ||
      roomRecord.gameState.challengeState?.phase !== "claimed" ||
      roomRecord.gameState.challengeState.challengerPlayerId !== disconnectedPlayerId
    )
      return null;

    const challenger = roomRecord.roomState.players.find((p) => p.id === disconnectedPlayerId);
    if (challenger?.connectionStatus !== "disconnected") return null;

    const nextGameState = this.gameFlowService.cancelClaimedChallengeForOfflineChallenger(
      roomRecord.gameState,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  private applyHostTransfer(
    roomId: RoomId,
    targetPlayerId: string,
    options: { requireConnectedTarget: boolean },
  ): PublicRoomState {
    const roomRecord = this.store.getRoom(roomId);
    if (!roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");

    const targetPlayer = roomRecord.roomState.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) throw new Error("HOST_TRANSFER_TARGET_NOT_FOUND");
    if (roomRecord.roomState.hostId === targetPlayerId)
      throw new Error("HOST_TRANSFER_TARGET_IS_ALREADY_HOST");
    if (options.requireConnectedTarget && targetPlayer.connectionStatus !== "connected") {
      throw new Error("HOST_TRANSFER_TARGET_DISCONNECTED");
    }

    const nextRoomState = buildHostTransferredRoomState(roomRecord.roomState, targetPlayerId);
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }
}

function removePlayerFromGameState(gameState: GameState, playerId: string): GameState {
  const players = gameState.players.filter((player) => player.id !== playerId);
  const timelines = { ...gameState.timelines };
  delete timelines[playerId];

  return {
    ...gameState,
    players,
    timelines,
  };
}
