import { GameFlowService, type GameTrackCard } from "@tunetrack/game-engine";
import { randomUUID } from "node:crypto";
import {
  type AwardTtPayloadParsed,
  type CloseRoomPayloadParsed,
  type PublicRoomState,
  type RenameRoomPayloadParsed,
  type RoomId,
  type SpotifyAccountType,
  type UpdatePlayerProfilePayloadParsed,
  type UpdatePlayerSettingsPayloadParsed,
  type UpdateRoomSettingsPayloadParsed,
  DomainError,
} from "@tunetrack/shared";
import type { RoomConnectionService } from "./RoomConnectionService.js";
import {
  logPlayerJoined,
  logRoomClosed,
  logRoomCreated,
  logRoomRenamed,
} from "./roomLifecycleLog.js";
import {
  buildAwardedTtLobbyRoomState,
  buildInitialRoomState,
  buildPlayerJoinedRoomState,
  buildRenamedRoomState,
  buildSpotifyAuthRoomState,
  buildUpdatedPlayerSettingsRoomState,
  buildUpdatedProfileRoomState,
  buildUpdatedSettingsRoomState,
} from "./roomLobbyBuilders.js";
import { mapGameStateToPublicRoomState } from "./roomStateMappers.js";
import { generateUniqueRoomCode } from "./roomCodeGenerator.js";
import type { JoinRoomResult, RoomStore } from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type RoomStateChangedEmitter = (roomState: PublicRoomState) => void;
type RoomRenamedEmitter = (previousRoomId: RoomId, nextRoomId: RoomId) => void;
type RoomClosedEmitter = (roomId: RoomId) => void;

export class RoomLobbyService {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly connection: RoomConnectionService,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
    private readonly maxActiveRoomCount: number,
    private readonly emitRoomRenamed: RoomRenamedEmitter = () => undefined,
    private readonly emitRoomClosed: RoomClosedEmitter = () => undefined,
  ) {}

  public createRoom(
    requestedRoomId: RoomId | undefined,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    const existingSessionMembership = this.store.getSessionMembership(sessionId);

    if (!requestedRoomId && existingSessionMembership) {
      const existingSessionRoom = this.store.getRoom(existingSessionMembership.roomId);
      if (
        existingSessionRoom?.roomState.players.some(
          (player) => player.id === existingSessionMembership.playerId,
        )
      ) {
        return this.connection.restorePlayerSession(
          existingSessionMembership.roomId,
          existingSessionMembership.playerId,
          socketId,
          sessionId,
        );
      }
    }

    const roomId =
      requestedRoomId ?? generateUniqueRoomCode((candidate) => this.store.hasRoom(candidate));
    const existingRoomRecord = this.store.getRoom(roomId);

    if (
      existingRoomRecord &&
      existingSessionMembership?.roomId === roomId &&
      existingRoomRecord.roomState.players.some(
        (player) => player.id === existingSessionMembership.playerId,
      )
    ) {
      return this.connection.restorePlayerSession(
        roomId,
        existingSessionMembership.playerId,
        socketId,
        sessionId,
      );
    }

    if (existingRoomRecord) {
      throw new DomainError("ROOM_ALREADY_EXISTS");
    }

    const isLeavingFreeingARoom =
      existingSessionMembership !== undefined &&
      this.store.getRoom(existingSessionMembership.roomId)?.roomState.players.length === 1;
    const roomCountAfterLeaving = this.store.roomCount - (isLeavingFreeingARoom ? 1 : 0);
    if (roomCountAfterLeaving >= this.maxActiveRoomCount) {
      throw new DomainError("ROOM_LIMIT_REACHED");
    }

    if (existingSessionMembership) this.leaveCurrentRoom(sessionId);

    const playerId = randomUUID();
    const roomState = buildInitialRoomState(roomId, playerId, displayName);
    this.store.setRoom(roomId, {
      gameState: null,
      roomState,
      trackCardsById: new Map<string, GameTrackCard>(),
      importedDeck: null,
    });
    this.store.setSocketMembership(socketId, { playerId, roomId, sessionId });
    this.store.setSessionMembership(sessionId, { playerId, roomId });
    const result = { playerId, roomState };
    logRoomCreated(result, displayName);
    return result;
  }

  public addPlayerToRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    const existingRoomRecord = this.store.getRoom(roomId);
    const existingSessionMembership = this.store.getSessionMembership(sessionId);

    if (existingSessionMembership?.roomId === roomId) {
      return this.connection.restorePlayerSession(
        roomId,
        existingSessionMembership.playerId,
        socketId,
        sessionId,
      );
    }

    if (
      existingSessionMembership &&
      !existingRoomRecord &&
      this.store.getRedirect(roomId) === existingSessionMembership.roomId
    ) {
      const restoredExistingRoom = this.connection.tryRestoreExistingSessionRoom(
        existingSessionMembership,
        socketId,
        sessionId,
      );
      if (restoredExistingRoom) return restoredExistingRoom;
    }

    if (!existingRoomRecord) {
      throw new DomainError("ROOM_NOT_FOUND");
    }

    if (existingRoomRecord.roomState.status !== "lobby") {
      throw new DomainError("GAME_ALREADY_STARTED");
    }

    if (existingSessionMembership) this.leaveCurrentRoom(sessionId);

    const playerId = randomUUID();
    const nextRoomState = buildPlayerJoinedRoomState(
      existingRoomRecord.roomState,
      playerId,
      displayName,
    );
    this.store.setRoom(roomId, { ...existingRoomRecord, roomState: nextRoomState });
    this.store.setSocketMembership(socketId, { playerId, roomId, sessionId });
    this.store.setSessionMembership(sessionId, { playerId, roomId });
    const result = { playerId, roomState: nextRoomState };
    logPlayerJoined(result, displayName);
    return result;
  }

  public updateRoomSettings(
    socketId: string,
    roomId: RoomId,
    payload: UpdateRoomSettingsPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new DomainError("ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS");
    }

    const nextRoomState = buildUpdatedSettingsRoomState(roomRecord.roomState, payload);
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public renameRoom(
    socketId: string,
    payload: RenameRoomPayloadParsed,
  ): { previousRoomId: RoomId; roomState: PublicRoomState } {
    if (payload.roomId === payload.nextRoomId) {
      return {
        previousRoomId: payload.roomId,
        roomState: this.store.getRoomRecordForMember(socketId, payload.roomId).roomState,
      };
    }

    if (this.store.hasRoom(payload.nextRoomId)) {
      throw new DomainError("ROOM_ALREADY_EXISTS");
    }

    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new DomainError("ONLY_HOST_CAN_RENAME_ROOM");
    }
    if (roomRecord.roomState.status !== "lobby") {
      throw new DomainError("GAME_ALREADY_STARTED");
    }

    const nextRoomState = buildRenamedRoomState(roomRecord.roomState, payload.nextRoomId);
    this.store.retargetProcessedActionAcks(payload.roomId, payload.nextRoomId);
    this.store.deleteRoom(payload.roomId);
    this.store.retargetRoomRedirects(payload.roomId, payload.nextRoomId);
    this.store.setRedirect(payload.roomId, payload.nextRoomId);
    this.store.setRoom(payload.nextRoomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });
    this.store.retargetMembershipsToRoom(payload.roomId, payload.nextRoomId);
    this.emitRoomRenamed(payload.roomId, payload.nextRoomId);
    logRoomRenamed(payload.roomId, payload.nextRoomId, socketId);

    return { previousRoomId: payload.roomId, roomState: nextRoomState };
  }

  public updatePlayerSettings(
    socketId: string,
    payload: UpdatePlayerSettingsPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new DomainError("ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS");
    }
    if (!roomRecord.roomState.players.some((p) => p.id === payload.playerId)) {
      throw new DomainError("PLAYER_NOT_FOUND");
    }

    const nextRoomState = buildUpdatedPlayerSettingsRoomState(roomRecord.roomState, payload);
    this.store.setRoom(payload.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public updatePlayerProfile(
    socketId: string,
    payload: UpdatePlayerProfilePayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.status !== "lobby") throw new DomainError("GAME_ALREADY_STARTED");

    const nextRoomState = buildUpdatedProfileRoomState(
      roomRecord.roomState,
      membership.playerId,
      payload.displayName,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public awardTt(socketId: string, payload: AwardTtPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new DomainError("ONLY_HOST_CAN_AWARD_TT");
    if (!roomRecord.roomState.players.some((p) => p.id === payload.playerId)) {
      throw new DomainError("PLAYER_NOT_FOUND");
    }

    const nextGameState = roomRecord.gameState
      ? this.gameFlowService.awardTtTokens(roomRecord.gameState, payload.playerId, payload.amount)
      : null;
    const nextRoomState = nextGameState
      ? mapGameStateToPublicRoomState(
          roomRecord.roomState,
          nextGameState,
          roomRecord.trackCardsById,
        )
      : buildAwardedTtLobbyRoomState(roomRecord.roomState, payload.playerId, payload.amount);

    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public setSpotifyAuthStatus(
    socketId: string,
    roomId: RoomId,
    status: "none" | "connected",
    accountType: SpotifyAccountType | null,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new DomainError("ONLY_HOST_CAN_SET_SPOTIFY_AUTH");

    const nextRoomState = buildSpotifyAuthRoomState(
      roomRecord.roomState,
      status,
      accountType,
      status === "connected" ? membership.playerId : null,
    );
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public closeRoom(socketId: string, payload: CloseRoomPayloadParsed): RoomId {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new DomainError("ONLY_HOST_CAN_CLOSE_ROOM");

    this.timers.clearForRoom(payload.roomId);
    this.store.clearMembershipsForRoom(payload.roomId);
    this.store.deleteRoom(payload.roomId);
    this.store.clearRoomRedirects(payload.roomId);
    this.emitRoomClosed(payload.roomId);
    logRoomClosed(payload.roomId, socketId);
    return payload.roomId;
  }

  private leaveCurrentRoom(sessionId: string): void {
    const previousRoomState = this.connection.removePlayerBySessionId(sessionId);
    if (previousRoomState) this.emitRoomStateChanged(previousRoomState);
  }
}
