import { DomainError } from "@tunetrack/shared";
import { GameFlowService } from "@tunetrack/game-engine";
import type { PublicRoomState, RoomId, TransferHostPayloadParsed } from "@tunetrack/shared";
import {
  buildConnectedRoomState,
  buildDisconnectedRoomState,
  buildPlayerRemovedRoomState,
  didSpotifyPlaybackOwnerChange,
} from "./roomConnectionBuilders.js";
import type { RoomDisconnectPolicy } from "./RoomDisconnectPolicy.js";
import type { RoomHostTransfer } from "./RoomHostTransfer.js";
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
type SocketLeftEmitter = (socketId: string) => void;

export class RoomConnectionService {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly hostTransfer: RoomHostTransfer,
    private readonly disconnectPolicy: RoomDisconnectPolicy,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
    private readonly emitSpotifyPlaybackHandoff: SpotifyPlaybackHandoffEmitter,
    private readonly emitRoomDirectoryChanged: RoomDirectoryChangedEmitter,
    private readonly emitSocketLeft: SocketLeftEmitter,
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
    return this.hostTransfer.apply(payload.roomId, payload.playerId, {
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

    const nextRoomState = gameState
      ? mapGameStateToPublicRoomState(baseRoomState, gameState, roomRecord.trackCardsById)
      : baseRoomState;

    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState: nextRoomState });
    this.afterPlayerRemoved(payload.roomId, roomRecord.roomState, nextRoomState);

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
    this.afterPlayerRemoved(membership.roomId, roomRecord.roomState, nextRoomState);

    return nextRoomState;
  }

  private afterPlayerRemoved(
    roomId: RoomId,
    previousRoomState: PublicRoomState,
    nextRoomState: PublicRoomState,
  ): void {
    if (didSpotifyPlaybackOwnerChange(previousRoomState, nextRoomState)) {
      this.emitSpotifyPlaybackHandoff(roomId);
    }
    this.disconnectPolicy.scheduleExpiryIfEveryoneOffline(roomId, nextRoomState);
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

    return this.disconnectPolicy.startGraces(
      membership,
      roomRecord,
      disconnectedRoomState,
      disconnectedAtEpochMs,
    );
  }

  private markPlayerConnected(roomId: RoomId, playerId: string): PublicRoomState {
    const roomRecord = this.store.getRoom(roomId);
    if (!roomRecord) throw new DomainError("ROOM_MEMBERSHIP_NOT_FOUND");

    const connectedRoomState = buildConnectedRoomState(roomRecord.roomState, playerId);
    this.store.setRoom(roomId, { ...roomRecord, roomState: connectedRoomState });
    return this.hostTransfer.promoteIfHostOffline(roomId, connectedRoomState);
  }
}
