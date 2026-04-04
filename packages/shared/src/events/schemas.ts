import { z } from "zod";
import {
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_MIN_LENGTH,
  ROOM_CODE_MAX_LENGTH,
  ROOM_CODE_MIN_LENGTH,
} from "../constants/gameplay.js";

export const joinRoomPayloadSchema = z.object({
  roomId: z
    .string()
    .trim()
    .min(ROOM_CODE_MIN_LENGTH)
    .max(ROOM_CODE_MAX_LENGTH)
    .regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().trim().min(PLAYER_NAME_MIN_LENGTH).max(PLAYER_NAME_MAX_LENGTH),
});

export const updateRoomSettingsPayloadSchema = z.object({
  roomId: z
    .string()
    .trim()
    .min(ROOM_CODE_MIN_LENGTH)
    .max(ROOM_CODE_MAX_LENGTH)
    .regex(/^[a-zA-Z0-9_-]+$/),
  targetTimelineCardCount: z
    .number()
    .int()
    .min(MIN_TARGET_TIMELINE_CARD_COUNT)
    .max(MAX_TARGET_TIMELINE_CARD_COUNT),
});

export type JoinRoomPayloadInput = z.input<typeof joinRoomPayloadSchema>;
export type JoinRoomPayloadParsed = z.output<typeof joinRoomPayloadSchema>;
export type UpdateRoomSettingsPayloadInput = z.input<
  typeof updateRoomSettingsPayloadSchema
>;
export type UpdateRoomSettingsPayloadParsed = z.output<
  typeof updateRoomSettingsPayloadSchema
>;
