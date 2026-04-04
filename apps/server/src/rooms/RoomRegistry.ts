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

export class RoomRegistry {
  private readonly roomsById = new Map<RoomId, PublicRoomState>();
  private readonly socketMemberships = new Map<string, SocketRoomMembership>();

  public addPlayerToRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
  ): PublicRoomState {
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

      return roomState;
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
