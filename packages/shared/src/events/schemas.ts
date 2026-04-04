import { z } from "zod";
import {
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_MIN_LENGTH,
  ROOM_CODE_MAX_LENGTH,
  ROOM_CODE_MIN_LENGTH,
} from "../constants/gameplay.js";
import type { RevealConfirmMode } from "../game/roomSettings.js";

const roomIdSchema = z
  .string()
  .trim()
  .min(ROOM_CODE_MIN_LENGTH)
  .max(ROOM_CODE_MAX_LENGTH)
  .regex(/^[a-zA-Z0-9_-]+$/);

const revealConfirmModeSchema = z.enum([
  "host_only",
  "host_or_active_player",
]) satisfies z.ZodType<RevealConfirmMode>;

export const joinRoomPayloadSchema = z.object({
  roomId: roomIdSchema,
  displayName: z.string().trim().min(PLAYER_NAME_MIN_LENGTH).max(PLAYER_NAME_MAX_LENGTH),
});

export const updateRoomSettingsPayloadSchema = z.object({
  roomId: roomIdSchema,
  targetTimelineCardCount: z
    .number()
    .int()
    .min(MIN_TARGET_TIMELINE_CARD_COUNT)
    .max(MAX_TARGET_TIMELINE_CARD_COUNT)
    .default(DEFAULT_TARGET_TIMELINE_CARD_COUNT),
  defaultStartingTimelineCardCount: z
    .number()
    .int()
    .min(MIN_STARTING_TIMELINE_CARD_COUNT)
    .max(MAX_STARTING_TIMELINE_CARD_COUNT)
    .default(DEFAULT_STARTING_TIMELINE_CARD_COUNT),
  revealConfirmMode: revealConfirmModeSchema.default("host_only"),
});

export const updatePlayerSettingsPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: z.string().trim().min(1),
  startingTimelineCardCount: z
    .number()
    .int()
    .min(MIN_STARTING_TIMELINE_CARD_COUNT)
    .max(MAX_STARTING_TIMELINE_CARD_COUNT),
});

export const startGamePayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const placeCardPayloadSchema = z.object({
  roomId: roomIdSchema,
  selectedSlotIndex: z.number().int().nonnegative(),
});

export const confirmRevealPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export type JoinRoomPayloadInput = z.input<typeof joinRoomPayloadSchema>;
export type JoinRoomPayloadParsed = z.output<typeof joinRoomPayloadSchema>;
export type UpdateRoomSettingsPayloadInput = z.input<
  typeof updateRoomSettingsPayloadSchema
>;
export type UpdateRoomSettingsPayloadParsed = z.output<
  typeof updateRoomSettingsPayloadSchema
>;
export type UpdatePlayerSettingsPayloadInput = z.input<
  typeof updatePlayerSettingsPayloadSchema
>;
export type UpdatePlayerSettingsPayloadParsed = z.output<
  typeof updatePlayerSettingsPayloadSchema
>;
export type StartGamePayloadInput = z.input<typeof startGamePayloadSchema>;
export type StartGamePayloadParsed = z.output<typeof startGamePayloadSchema>;
export type PlaceCardPayloadInput = z.input<typeof placeCardPayloadSchema>;
export type PlaceCardPayloadParsed = z.output<typeof placeCardPayloadSchema>;
export type ConfirmRevealPayloadInput = z.input<typeof confirmRevealPayloadSchema>;
export type ConfirmRevealPayloadParsed = z.output<
  typeof confirmRevealPayloadSchema
>;
