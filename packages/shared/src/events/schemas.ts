import { z } from "zod";
import {
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
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
  sessionId: z.string().trim().min(1),
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

export const updatePlayerSettingsPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: z.string().trim().min(1),
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
  displayName: z.string().trim().min(PLAYER_NAME_MIN_LENGTH).max(PLAYER_NAME_MAX_LENGTH),
});

export const awardTtPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: z.string().trim().min(1),
  amount: z.number().int().min(-5).max(5).refine((amount) => amount !== 0),
});

export const startGamePayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const transferHostPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: z.string().trim().min(1),
});

export const placeCardPayloadSchema = z.object({
  roomId: roomIdSchema,
  selectedSlotIndex: z.number().int().nonnegative(),
});

export const confirmRevealPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const closeRoomPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const claimChallengePayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const placeChallengePayloadSchema = z.object({
  roomId: roomIdSchema,
  selectedSlotIndex: z.number().int().nonnegative(),
});

export const resolveChallengeWindowPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const skipTrackWithTtPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const buyTimelineCardWithTtPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const skipTurnPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const importPlaylistPayloadSchema = z.object({
  roomId: roomIdSchema,
  playlistUrl: z.string().trim().min(1).max(500),
});

export const requestSpotifyAuthUrlPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const refreshSpotifyTokenPayloadSchema = z.object({
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
export type UpdatePlayerProfilePayloadInput = z.input<
  typeof updatePlayerProfilePayloadSchema
>;
export type UpdatePlayerProfilePayloadParsed = z.output<
  typeof updatePlayerProfilePayloadSchema
>;
export type AwardTtPayloadInput = z.input<typeof awardTtPayloadSchema>;
export type AwardTtPayloadParsed = z.output<typeof awardTtPayloadSchema>;
export type StartGamePayloadInput = z.input<typeof startGamePayloadSchema>;
export type StartGamePayloadParsed = z.output<typeof startGamePayloadSchema>;
export type TransferHostPayloadInput = z.input<typeof transferHostPayloadSchema>;
export type TransferHostPayloadParsed = z.output<typeof transferHostPayloadSchema>;
export type PlaceCardPayloadInput = z.input<typeof placeCardPayloadSchema>;
export type PlaceCardPayloadParsed = z.output<typeof placeCardPayloadSchema>;
export type ConfirmRevealPayloadInput = z.input<typeof confirmRevealPayloadSchema>;
export type ConfirmRevealPayloadParsed = z.output<
  typeof confirmRevealPayloadSchema
>;
export type CloseRoomPayloadInput = z.input<typeof closeRoomPayloadSchema>;
export type CloseRoomPayloadParsed = z.output<typeof closeRoomPayloadSchema>;
export type ClaimChallengePayloadInput = z.input<
  typeof claimChallengePayloadSchema
>;
export type ClaimChallengePayloadParsed = z.output<
  typeof claimChallengePayloadSchema
>;
export type PlaceChallengePayloadInput = z.input<
  typeof placeChallengePayloadSchema
>;
export type PlaceChallengePayloadParsed = z.output<
  typeof placeChallengePayloadSchema
>;
export type ResolveChallengeWindowPayloadInput = z.input<
  typeof resolveChallengeWindowPayloadSchema
>;
export type ResolveChallengeWindowPayloadParsed = z.output<
  typeof resolveChallengeWindowPayloadSchema
>;
export type SkipTrackWithTtPayloadInput = z.input<
  typeof skipTrackWithTtPayloadSchema
>;
export type SkipTrackWithTtPayloadParsed = z.output<
  typeof skipTrackWithTtPayloadSchema
>;
export type BuyTimelineCardWithTtPayloadInput = z.input<
  typeof buyTimelineCardWithTtPayloadSchema
>;
export type BuyTimelineCardWithTtPayloadParsed = z.output<
  typeof buyTimelineCardWithTtPayloadSchema
>;
export type SkipTurnPayloadInput = z.input<typeof skipTurnPayloadSchema>;
export type SkipTurnPayloadParsed = z.output<typeof skipTurnPayloadSchema>;

export type ImportPlaylistPayloadInput = z.input<typeof importPlaylistPayloadSchema>;
export type ImportPlaylistPayloadParsed = z.output<typeof importPlaylistPayloadSchema>;

export type RequestSpotifyAuthUrlPayloadInput = z.input<typeof requestSpotifyAuthUrlPayloadSchema>;
export type RequestSpotifyAuthUrlPayloadParsed = z.output<typeof requestSpotifyAuthUrlPayloadSchema>;

export type RefreshSpotifyTokenPayloadInput = z.input<typeof refreshSpotifyTokenPayloadSchema>;
export type RefreshSpotifyTokenPayloadParsed = z.output<typeof refreshSpotifyTokenPayloadSchema>;

export const getPlaylistTracksPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const removePlaylistTracksPayloadSchema = z.object({
  roomId: roomIdSchema,
  trackIds: z.array(z.string().trim().min(1)).min(1).max(500),
});

export type GetPlaylistTracksPayloadParsed = z.output<typeof getPlaylistTracksPayloadSchema>;
export type RemovePlaylistTracksPayloadParsed = z.output<typeof removePlaylistTracksPayloadSchema>;
