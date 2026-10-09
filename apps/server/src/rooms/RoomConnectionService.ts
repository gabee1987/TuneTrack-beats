import { DomainError } from "@tunetrack/shared";
import { GameFlowService } from "@tunetrack/game-engine";
import type { PublicRoomState, RoomId, TransferHostPayloadParsed } from "@tunetrack/shared";
import {
  buildConnectedRoomState,
  buildDisconnectedRoomState,
  buildHostTransferredRoomState,
  buildPlayerRemovedRoomState,
  selectAutomaticHostCandidate,
  selectNextConnectedTurnPlayer,
} from "./roomConnectionBuilders.js";
import { logPlayerLeft } from "./roomLifecycleLog.js";
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
type SpotifyPlaybackHandoffEmitter = (roomId: RoomId) => void;
type RoomDirectoryChangedEmitter = () => void;
type RoomExpiredEmitter = (roomId: RoomId) => void;
type SocketLeftEmitter = (socketId: string) => void;

export class RoomConnectionService {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
    private readonly emitSpotifyPlaybackHandoff: SpotifyPlaybackHandoffEmitter = () => undefined,
    private readonly emitRoomDirectoryChanged: RoomDirectoryChangedEmitter = () => undefined,
    private readonly emitRoomExpired: RoomExpiredEmitter = () => undefined,
    private readonly emitSocketLeft: SocketLeftEmitter = () => undefined,
  ) {}

  public removePlayerBySocketId(socketId: string): PublicRoomState | null {
    this.emitSocketLeft(socketId);
    const roomState = this.removeSocketMembership(socketId);
    if (roomState) logPlayerLeft(socketId, roomState);
    return roomState;
  }

  private removeSocketMembership(socketId: string): PublicRoomState | null {
    const membership = this.store.getSocketMembership(socketId);
    if (!membership) return null;

    this.store.deleteSocketMembership(socketId);

    if (this.store.hasSocketMembershipForSession(membership.sessionId)) {
      return null;
    }

    const roomState = this.markPlayerDisconnected(membership);

    if (roomState?.status === "lobby") {
      this.timers.scheduleReconnect(
        membership.sessionId,
        this.timers.reconnectGracePeriodMs,
        () => {
          this.removeLobbyPlayerAfterReconnectGrace(membership.sessionId);
        },
      );
    }

    return roomState;
  }

  public transferHost(socketId: string, payload: TransferHostPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new DomainError("ONLY_HOST_CAN_TRANSFER_HOST");
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
      throw new DomainError("ONLY_HOST_CAN_KICK_PLAYER");
    if (payload.playerId === membership.playerId) throw new DomainError("CANNOT_KICK_YOURSELF");
    if (!roomRecord.roomState.players.find((p) => p.id === payload.playerId))
      throw new DomainError("PLAYER_NOT_FOUND");

    const targetSessionId = this.store.findSessionIdForPlayer(payload.roomId, payload.playerId);
    if (targetSessionId) {
      this.timers.clearForSession(targetSessionId);
      this.store.deleteSessionMembership(targetSessionId);
    }
    const kickedSocketIds = this.store.collectAndClearSocketIdsForPlayer(
      payload.roomId,
      payload.playerId,
    );

    const gameState = roomRecord.gameState
      ? this.gameFlowService.removePlayer(roomRecord.gameState, payload.playerId)
      : null;
    if (gameState?.phase !== "challenge") this.timers.clearChallenge(payload.roomId);

    const { nextRoomState: baseRoomState } = buildPlayerRemovedRoomState(
      roomRecord.roomState,
      payload.playerId,
    );
    if (!baseRoomState) {
      this.timers.clearForRoom(payload.roomId);
      this.store.deleteRoom(payload.roomId);
      throw new DomainError("ROOM_EMPTY_AFTER_KICK");
    }

    const previousPlaybackOwner = roomRecord.roomState.settings.spotifyPlaybackOwnerPlayerId;
    const previousPlaybackGeneration = roomRecord.roomState.settings.spotifyPlaybackGeneration;

    const nextRoomState = gameState
      ? mapGameStateToPublicRoomState(baseRoomState, gameState, roomRecord.trackCardsById)
      : baseRoomState;

    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState: nextRoomState });

    if (
      nextRoomState.settings.spotifyPlaybackOwnerPlayerId !== previousPlaybackOwner ||
      nextRoomState.settings.spotifyPlaybackGeneration !== previousPlaybackGeneration
    ) {
      this.emitSpotifyPlaybackHandoff(payload.roomId);
    }

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
      throw new DomainError("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    this.timers.clearAllPlayersOffline(roomId);
    this.store.clearOtherSocketMembershipsForSession(sessionId, socketId);
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
    this.timers.clearForSession(sessionId);
    this.store.deleteSessionMembership(sessionId);
    this.store.deleteSocketMembershipsForSession(sessionId);

    const roomRecord = this.store.getRoom(membership.roomId);
    if (!roomRecord) return null;

    const previousPlaybackOwner = roomRecord.roomState.settings.spotifyPlaybackOwnerPlayerId;
    const previousPlaybackGeneration = roomRecord.roomState.settings.spotifyPlaybackGeneration;
    const { nextRoomState: baseRoomState } = buildPlayerRemovedRoomState(
      roomRecord.roomState,
      membership.playerId,
    );
    if (!baseRoomState) {
      this.timers.clearForRoom(membership.roomId);
      this.store.deleteRoom(membership.roomId);
      this.store.clearRoomRedirects(membership.roomId);
      this.emitRoomDirectoryChanged();
      return null;
    }

    const gameState = roomRecord.gameState
      ? this.gameFlowService.removePlayer(roomRecord.gameState, membership.playerId)
      : null;
    if (gameState?.phase !== "challenge") this.timers.clearChallenge(membership.roomId);
    const nextRoomState = gameState
      ? mapGameStateToPublicRoomState(baseRoomState, gameState, roomRecord.trackCardsById)
      : baseRoomState;

    this.store.setRoom(membership.roomId, { ...roomRecord, gameState, roomState: nextRoomState });

    if (
      nextRoomState.settings.spotifyPlaybackOwnerPlayerId !== previousPlaybackOwner ||
      nextRoomState.settings.spotifyPlaybackGeneration !== previousPlaybackGeneration
    ) {
      this.emitSpotifyPlaybackHandoff(membership.roomId);
    }

    return nextRoomState;
  }

  // A game started inside the grace keeps the player reserved like any in-game disconnect.
  private removeLobbyPlayerAfterReconnectGrace(sessionId: string): void {
    const membership = this.store.getSessionMembership(sessionId);
    if (!membership || this.store.getRoom(membership.roomId)?.roomState.status !== "lobby") return;

    const nextRoomState = this.removePlayerBySessionId(sessionId);
    if (nextRoomState) this.emitRoomStateChanged(nextRoomState);
  }

  private markPlayerDisconnected(membership: SocketRoomMembership): PublicRoomState | null {
    const roomRecord = this.store.getRoom(membership.roomId);
    if (!roomRecord) return null;

    const disconnectedAtEpochMs = Date.now();
    const isGameInProgress = roomRecord.roomState.status !== "lobby";
    const reconnectExpiresAtEpochMs = isGameInProgress
      ? null
      : disconnectedAtEpochMs + this.timers.reconnectGracePeriodMs;

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

    if (
      effectiveRoomState.status !== "lobby" &&
      effectiveRoomState.players.every((player) => player.connectionStatus === "disconnected")
    ) {
      this.timers.scheduleAllPlayersOffline(membership.roomId, () => {
        this.closeRoomIfEveryPlayerIsOffline(membership.roomId);
      });
    }

    return effectiveRoomState;
  }

  private closeRoomIfEveryPlayerIsOffline(roomId: RoomId): void {
    const roomRecord = this.store.getRoom(roomId);
    if (
      !roomRecord ||
      roomRecord.roomState.status === "lobby" ||
      roomRecord.roomState.players.some((player) => player.connectionStatus === "connected")
    ) {
      return;
    }

    this.timers.clearForRoom(roomId);
    this.store.clearMembershipsForRoom(roomId);
    this.store.deleteRoom(roomId);
    this.store.clearRoomRedirects(roomId);
    this.emitRoomExpired(roomId);
  }

  private markPlayerConnected(roomId: RoomId, playerId: string): PublicRoomState {
    const roomRecord = this.store.getRoom(roomId);
    if (!roomRecord) throw new DomainError("ROOM_MEMBERSHIP_NOT_FOUND");

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
    if (!roomRecord) throw new DomainError("ROOM_MEMBERSHIP_NOT_FOUND");

    const targetPlayer = roomRecord.roomState.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) throw new DomainError("HOST_TRANSFER_TARGET_NOT_FOUND");
    if (roomRecord.roomState.hostId === targetPlayerId)
      throw new DomainError("HOST_TRANSFER_TARGET_IS_ALREADY_HOST");
    if (options.requireConnectedTarget && targetPlayer.connectionStatus !== "connected") {
      throw new DomainError("HOST_TRANSFER_TARGET_DISCONNECTED");
    }

    const previousPlaybackOwner = roomRecord.roomState.settings.spotifyPlaybackOwnerPlayerId;
    const previousPlaybackGeneration = roomRecord.roomState.settings.spotifyPlaybackGeneration;
    const nextRoomState = buildHostTransferredRoomState(roomRecord.roomState, targetPlayerId);
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });

    if (
      nextRoomState.settings.spotifyPlaybackOwnerPlayerId !== previousPlaybackOwner ||
      nextRoomState.settings.spotifyPlaybackGeneration !== previousPlaybackGeneration
    ) {
      this.emitSpotifyPlaybackHandoff(roomId);
    }

    return nextRoomState;
  }
}
