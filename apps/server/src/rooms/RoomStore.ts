import type { GameState, GameTrackCard } from "@tunetrack/game-engine";
import type { PublicRoomState, PublicRoomSummary, RoomId } from "@tunetrack/shared";

export interface SocketRoomMembership {
  playerId: string;
  roomId: RoomId;
  sessionId: string;
}

export interface SessionRoomMembership {
  playerId: string;
  roomId: RoomId;
}

export interface RoomRecord {
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

export class RoomStore {
  private readonly roomsById = new Map<RoomId, RoomRecord>();
  private readonly roomRedirectsById = new Map<RoomId, RoomId>();
  private readonly socketMemberships = new Map<string, SocketRoomMembership>();
  private readonly sessionMemberships = new Map<string, SessionRoomMembership>();

  public get roomCount(): number {
    return this.roomsById.size;
  }

  public hasRoom(roomId: RoomId): boolean {
    return this.roomsById.has(roomId);
  }

  public getRoom(roomId: RoomId): RoomRecord | undefined {
    return this.roomsById.get(roomId);
  }

  public setRoom(roomId: RoomId, roomRecord: RoomRecord): void {
    this.roomsById.set(roomId, roomRecord);
  }

  public deleteRoom(roomId: RoomId): void {
    this.roomsById.delete(roomId);
  }

  public listLobbySummaries(): PublicRoomSummary[] {
    return [...this.roomsById.values()]
      .map((roomRecord) => mapRoomStateToSummary(roomRecord.roomState))
      .filter((roomSummary) => roomSummary.status === "lobby");
  }

  public getLobbySummary(roomId: RoomId): PublicRoomSummary | null {
    const roomRecord = this.roomsById.get(roomId);
    if (!roomRecord || roomRecord.roomState.status !== "lobby") {
      return null;
    }

    return mapRoomStateToSummary(roomRecord.roomState);
  }

  public getImportedDeck(roomId: RoomId): GameTrackCard[] | null {
    return this.roomsById.get(roomId)?.importedDeck ?? null;
  }

  public getSocketMembership(socketId: string): SocketRoomMembership | undefined {
    return this.socketMemberships.get(socketId);
  }

  public setSocketMembership(socketId: string, membership: SocketRoomMembership): void {
    this.socketMemberships.set(socketId, membership);
  }

  public deleteSocketMembership(socketId: string): void {
    this.socketMemberships.delete(socketId);
  }

  public getSessionMembership(sessionId: string): SessionRoomMembership | undefined {
    return this.sessionMemberships.get(sessionId);
  }

  public setSessionMembership(sessionId: string, membership: SessionRoomMembership): void {
    this.sessionMemberships.set(sessionId, membership);
  }

  public deleteSessionMembership(sessionId: string): void {
    this.sessionMemberships.delete(sessionId);
  }

  public requireMembership(socketId: string): SocketRoomMembership {
    const membership = this.socketMemberships.get(socketId);
    if (!membership) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    return membership;
  }

  public getRoomRecordForMember(socketId: string, roomId: RoomId): RoomRecord {
    const membership = this.requireMembership(socketId);
    const roomRecord = this.roomsById.get(roomId);
    if (membership.roomId !== roomId || !roomRecord) throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    return roomRecord;
  }

  public findSessionIdForPlayer(roomId: string, playerId: string): string | undefined {
    for (const [sessionId, membership] of this.sessionMemberships) {
      if (membership.roomId === roomId && membership.playerId === playerId) return sessionId;
    }
    return undefined;
  }

  public getSessionIdsInRoom(roomId: RoomId): string[] {
    const sessionIds: string[] = [];
    for (const [sessionId, membership] of this.sessionMemberships) {
      if (membership.roomId === roomId) {
        sessionIds.push(sessionId);
      }
    }
    return sessionIds;
  }

  public getRedirect(roomId: RoomId): RoomId | undefined {
    return this.roomRedirectsById.get(roomId);
  }

  public setRedirect(fromRoomId: RoomId, toRoomId: RoomId): void {
    this.roomRedirectsById.set(fromRoomId, toRoomId);
  }

  public retargetRoomRedirects(previousRoomId: RoomId, nextRoomId: RoomId): void {
    for (const [sourceRoomId, targetRoomId] of this.roomRedirectsById) {
      if (targetRoomId === previousRoomId) {
        this.roomRedirectsById.set(sourceRoomId, nextRoomId);
      }
    }
  }

  public clearRoomRedirects(roomId: RoomId): void {
    for (const [sourceRoomId, targetRoomId] of this.roomRedirectsById) {
      if (sourceRoomId === roomId || targetRoomId === roomId) {
        this.roomRedirectsById.delete(sourceRoomId);
      }
    }
  }

  public retargetMembershipsToRoom(previousRoomId: RoomId, nextRoomId: RoomId): void {
    for (const [memberSocketId, socketMembership] of this.socketMemberships) {
      if (socketMembership.roomId === previousRoomId) {
        this.socketMemberships.set(memberSocketId, {
          ...socketMembership,
          roomId: nextRoomId,
        });
      }
    }
    for (const [sessionId, sessionMembership] of this.sessionMemberships) {
      if (sessionMembership.roomId === previousRoomId) {
        this.sessionMemberships.set(sessionId, {
          ...sessionMembership,
          roomId: nextRoomId,
        });
      }
    }
  }

  public clearMembershipsForRoom(roomId: RoomId): void {
    for (const [sessionId, sessionMembership] of this.sessionMemberships.entries()) {
      if (sessionMembership.roomId === roomId) {
        this.sessionMemberships.delete(sessionId);
      }
    }
    for (const [memberSocketId, socketMembership] of this.socketMemberships.entries()) {
      if (socketMembership.roomId === roomId) {
        this.socketMemberships.delete(memberSocketId);
      }
    }
  }

  public collectAndClearSocketIdsForPlayer(roomId: RoomId, playerId: string): string[] {
    const socketIds: string[] = [];
    for (const [socketId, membership] of this.socketMemberships) {
      if (membership.roomId === roomId && membership.playerId === playerId) {
        socketIds.push(socketId);
        this.socketMemberships.delete(socketId);
      }
    }
    return socketIds;
  }
}

function mapRoomStateToSummary(roomState: PublicRoomState): PublicRoomSummary {
  const hostPlayer = roomState.players.find((player) => player.id === roomState.hostId);

  return {
    hostName: hostPlayer?.displayName ?? "Host",
    playerCount: roomState.players.length,
    roomId: roomState.roomId,
    status: roomState.status,
  };
}
