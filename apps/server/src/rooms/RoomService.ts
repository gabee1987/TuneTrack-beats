import type {
  JoinRoomPayloadParsed,
  PublicRoomState,
  UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import { type JoinRoomResult, RoomRegistry } from "./RoomRegistry.js";

export class RoomService {
  public constructor(private readonly roomRegistry = new RoomRegistry()) {}

  public joinRoom(
    joinRoomPayload: JoinRoomPayloadParsed,
    socketId: string,
  ): JoinRoomResult {
    return this.roomRegistry.addPlayerToRoom(
      joinRoomPayload.roomId,
      joinRoomPayload.displayName,
      socketId,
    );
  }

  public updateRoomSettings(
    updateRoomSettingsPayload: UpdateRoomSettingsPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updateTargetTimelineCardCount(
      socketId,
      updateRoomSettingsPayload.roomId,
      updateRoomSettingsPayload.targetTimelineCardCount,
    );
  }

  public removePlayer(socketId: string): PublicRoomState | null {
    return this.roomRegistry.removePlayerBySocketId(socketId);
  }
}
