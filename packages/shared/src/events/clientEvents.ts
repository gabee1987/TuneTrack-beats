import type { RoomId } from "../game/roomState.js";

export const ClientToServerEvent = {
  JoinRoom: "join_room",
  UpdateRoomSettings: "update_room_settings",
} as const;

export type ClientToServerEventName =
  (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent];

export interface JoinRoomPayload {
  roomId: RoomId;
  displayName: string;
}

export interface UpdateRoomSettingsPayload {
  roomId: RoomId;
  targetTimelineCardCount: number;
}
