import type {
  JoinRoomPayloadParsed,
  PublicRoomState,
  UpdatePlayerSettingsPayloadParsed,
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
    return this.roomRegistry.updateRoomSettings(
      socketId,
      updateRoomSettingsPayload.roomId,
      updateRoomSettingsPayload,
    );
  }

  public updatePlayerSettings(
    updatePlayerSettingsPayload: UpdatePlayerSettingsPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updatePlayerSettings(
      socketId,
      updatePlayerSettingsPayload,
    );
  }

  public removePlayer(socketId: string): PublicRoomState | null {
    return this.roomRegistry.removePlayerBySocketId(socketId);
  }
}
