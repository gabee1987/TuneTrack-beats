import type { PublicRoomState } from "../game/roomState.js";

export const ServerToClientEvent = {
  StateUpdate: "state_update",
  Error: "error",
} as const;

export type ServerToClientEventName =
  (typeof ServerToClientEvent)[keyof typeof ServerToClientEvent];

export interface StateUpdatePayload {
  roomState: PublicRoomState;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}
