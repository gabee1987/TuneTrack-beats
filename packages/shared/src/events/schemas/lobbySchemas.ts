import { z } from "zod";
import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_MIN_LENGTH,
} from "../../constants/gameplay.js";
import {
  optionalRequestIdSchema,
  playerIdSchema,
  revealConfirmModeSchema,
  roomActionPayloadSchema,
  roomIdSchema,
} from "./commonSchemas.js";

const displayNameSchema = z.string().trim().min(PLAYER_NAME_MIN_LENGTH).max(PLAYER_NAME_MAX_LENGTH);

export const joinRoomPayloadSchema = z.object({
  roomId: roomIdSchema,
  displayName: displayNameSchema,
  sessionId: z.string().trim().min(1),
});

export const createRoomPayloadSchema = joinRoomPayloadSchema.extend({
  roomId: roomIdSchema.optional(),
});

export const getRoomPreviewPayloadSchema = z.object({
  roomId: roomIdSchema,
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
  startingTtTokenCount: z
    .number()
    .int()
    .min(MIN_STARTING_TT_TOKEN_COUNT)
    .max(MAX_STARTING_TT_TOKEN_COUNT)
    .default(DEFAULT_STARTING_TT_TOKEN_COUNT),
  revealConfirmMode: revealConfirmModeSchema.default("host_only"),
  ttModeEnabled: z.boolean().default(false),
  challengeWindowDurationSeconds: z
    .number()
    .int()
    .min(MIN_CHALLENGE_WINDOW_DURATION_SECONDS)
    .max(MAX_CHALLENGE_WINDOW_DURATION_SECONDS)
    .nullable()
    .default(DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS),
});

export const renameRoomPayloadSchema = z.object({
  roomId: roomIdSchema,
  nextRoomId: roomIdSchema,
  requestId: optionalRequestIdSchema,
});

export const updatePlayerSettingsPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: playerIdSchema,
  startingTimelineCardCount: z
    .number()
    .int()
    .min(MIN_STARTING_TIMELINE_CARD_COUNT)
    .max(MAX_STARTING_TIMELINE_CARD_COUNT),
  startingTtTokenCount: z
    .number()
    .int()
    .min(MIN_STARTING_TT_TOKEN_COUNT)
    .max(MAX_STARTING_TT_TOKEN_COUNT),
});

export const updatePlayerProfilePayloadSchema = z.object({
  roomId: roomIdSchema,
  displayName: displayNameSchema,
});

export const awardTtPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: playerIdSchema,
  amount: z
    .number()
    .int()
    .min(-5)
    .max(5)
    .refine((amount) => amount !== 0),
  requestId: optionalRequestIdSchema,
});

export const transferHostPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: playerIdSchema,
  requestId: optionalRequestIdSchema,
});

export const kickPlayerPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: playerIdSchema,
  requestId: optionalRequestIdSchema,
});

export const closeRoomPayloadSchema = roomActionPayloadSchema;

export type JoinRoomPayload = z.input<typeof joinRoomPayloadSchema>;
export type JoinRoomPayloadParsed = z.output<typeof joinRoomPayloadSchema>;
export type CreateRoomPayload = z.input<typeof createRoomPayloadSchema>;
export type CreateRoomPayloadParsed = z.output<typeof createRoomPayloadSchema>;
export type GetRoomPreviewPayload = z.input<typeof getRoomPreviewPayloadSchema>;
export type GetRoomPreviewPayloadParsed = z.output<typeof getRoomPreviewPayloadSchema>;
export type UpdateRoomSettingsPayload = z.input<typeof updateRoomSettingsPayloadSchema>;
export type UpdateRoomSettingsPayloadParsed = z.output<typeof updateRoomSettingsPayloadSchema>;
export type RenameRoomPayload = z.input<typeof renameRoomPayloadSchema>;
export type RenameRoomPayloadParsed = z.output<typeof renameRoomPayloadSchema>;
export type UpdatePlayerSettingsPayload = z.input<typeof updatePlayerSettingsPayloadSchema>;
export type UpdatePlayerSettingsPayloadParsed = z.output<typeof updatePlayerSettingsPayloadSchema>;
export type UpdatePlayerProfilePayload = z.input<typeof updatePlayerProfilePayloadSchema>;
export type UpdatePlayerProfilePayloadParsed = z.output<typeof updatePlayerProfilePayloadSchema>;
export type AwardTtPayload = z.input<typeof awardTtPayloadSchema>;
export type AwardTtPayloadParsed = z.output<typeof awardTtPayloadSchema>;
export type TransferHostPayload = z.input<typeof transferHostPayloadSchema>;
export type TransferHostPayloadParsed = z.output<typeof transferHostPayloadSchema>;
export type KickPlayerPayload = z.input<typeof kickPlayerPayloadSchema>;
export type KickPlayerPayloadParsed = z.output<typeof kickPlayerPayloadSchema>;
export type CloseRoomPayload = z.input<typeof closeRoomPayloadSchema>;
export type CloseRoomPayloadParsed = z.output<typeof closeRoomPayloadSchema>;
