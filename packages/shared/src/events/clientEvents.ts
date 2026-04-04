import type { RevealConfirmMode } from "../game/roomSettings.js";
import type { RoomId } from "../game/roomState.js";
import type { PlayerId } from "../game/player.js";

export const ClientToServerEvent = {
  ConfirmReveal: "confirm_reveal",
  JoinRoom: "join_room",
  PlaceCard: "place_card",
  StartGame: "start_game",
  UpdatePlayerSettings: "update_player_settings",
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
  defaultStartingTimelineCardCount: number;
  revealConfirmMode: RevealConfirmMode;
}

export interface UpdatePlayerSettingsPayload {
  roomId: RoomId;
  playerId: PlayerId;
  startingTimelineCardCount: number;
}

export interface StartGamePayload {
  roomId: RoomId;
}

export interface PlaceCardPayload {
  roomId: RoomId;
  selectedSlotIndex: number;
}

export interface ConfirmRevealPayload {
  roomId: RoomId;
}
