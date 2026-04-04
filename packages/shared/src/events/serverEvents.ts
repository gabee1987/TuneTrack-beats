import type { PlayerId } from "../game/player.js";
import type { PublicRoomState } from "../game/roomState.js";

export const ServerToClientEvent = {
  PlayerIdentity: "player_identity",
  StateUpdate: "state_update",
  Error: "error",
} as const;

export type ServerToClientEventName =
  (typeof ServerToClientEvent)[keyof typeof ServerToClientEvent];

export interface PlayerIdentityPayload {
  playerId: PlayerId;
}

export interface StateUpdatePayload {
  roomState: PublicRoomState;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}
