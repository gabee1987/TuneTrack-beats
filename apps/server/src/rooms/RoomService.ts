import type { JoinRoomPayloadParsed, PublicRoomState } from "@tunetrack/shared";
import { RoomRegistry } from "./RoomRegistry.js";

export class RoomService {
  public constructor(private readonly roomRegistry = new RoomRegistry()) {}

  public joinRoom(
    joinRoomPayload: JoinRoomPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.addPlayerToRoom(
      joinRoomPayload.roomId,
      joinRoomPayload.displayName,
      socketId,
    );
  }

  public removePlayer(socketId: string): PublicRoomState | null {
    return this.roomRegistry.removePlayerBySocketId(socketId);
  }
}
