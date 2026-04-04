import { randomUUID } from "node:crypto";
import {
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  type PublicPlayerState,
  type PublicRoomState,
  type RoomId,
} from "@tunetrack/shared";

interface SocketRoomMembership {
  playerId: string;
  roomId: RoomId;
}

export interface JoinRoomResult {
  playerId: string;
  roomState: PublicRoomState;
}

export class RoomRegistry {
  private readonly roomsById = new Map<RoomId, PublicRoomState>();
  private readonly socketMemberships = new Map<string, SocketRoomMembership>();

  public addPlayerToRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
  ): JoinRoomResult {
    const existingRoom = this.roomsById.get(roomId);
    const playerId = randomUUID();

    if (!existingRoom) {
      const playerState: PublicPlayerState = {
        id: playerId,
        displayName,
        isHost: true,
        tokenCount: 0,
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
      };

      this.roomsById.set(roomId, roomState);
      this.socketMemberships.set(socketId, { playerId, roomId });

      return {
        playerId,
        roomState,
      };
    }

    const playerState: PublicPlayerState = {
      id: playerId,
      displayName,
      isHost: false,
      tokenCount: 0,
    };

    const nextRoomState: PublicRoomState = {
      ...existingRoom,
      players: [...existingRoom.players, playerState],
      timelines: {
        ...existingRoom.timelines,
        [playerId]: [],
      },
    };

    this.roomsById.set(roomId, nextRoomState);
    this.socketMemberships.set(socketId, { playerId, roomId });

    return {
      playerId,
      roomState: nextRoomState,
    };
  }

  public updateTargetTimelineCardCount(
    socketId: string,
    roomId: RoomId,
    targetTimelineCardCount: number,
  ): PublicRoomState {
    const membership = this.socketMemberships.get(socketId);
    const roomState = this.roomsById.get(roomId);

    if (!membership || membership.roomId !== roomId || !roomState) {
      throw new Error("ROOM_MEMBERSHIP_NOT_FOUND");
    }

    if (roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS");
    }

    const nextRoomState: PublicRoomState = {
      ...roomState,
      targetTimelineCardCount,
    };

    this.roomsById.set(roomId, nextRoomState);

    return nextRoomState;
  }

  public removePlayerBySocketId(socketId: string): PublicRoomState | null {
    const membership = this.socketMemberships.get(socketId);

    if (!membership) {
      return null;
    }

    this.socketMemberships.delete(socketId);

    const roomState = this.roomsById.get(membership.roomId);

    if (!roomState) {
      return null;
    }

    const players = roomState.players.filter(
      (player) => player.id !== membership.playerId,
    );
    const timelines = { ...roomState.timelines };
    delete timelines[membership.playerId];

    if (players.length === 0) {
      this.roomsById.delete(membership.roomId);
      return null;
    }

    const hostId =
      roomState.hostId === membership.playerId
        ? (players[0]?.id ?? roomState.hostId)
        : roomState.hostId;
    const normalizedPlayers = players.map((player) => ({
      ...player,
      isHost: player.id === hostId,
    }));

    const nextRoomState: PublicRoomState = {
      ...roomState,
      hostId,
      players: normalizedPlayers,
      timelines,
    };

    this.roomsById.set(membership.roomId, nextRoomState);

    return nextRoomState;
  }
}
