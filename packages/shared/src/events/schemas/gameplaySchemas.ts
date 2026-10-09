import { z } from "zod";
import { optionalRequestIdSchema, roomActionPayloadSchema, roomIdSchema } from "./commonSchemas.js";

const slotPlacementPayloadSchema = z.object({
  roomId: roomIdSchema,
  selectedSlotIndex: z.number().int().nonnegative(),
  requestId: optionalRequestIdSchema,
});

export const startGamePayloadSchema = roomActionPayloadSchema;
export const placeCardPayloadSchema = slotPlacementPayloadSchema;
export const confirmRevealPayloadSchema = roomActionPayloadSchema;
export const claimChallengePayloadSchema = roomActionPayloadSchema;
export const placeChallengePayloadSchema = slotPlacementPayloadSchema;
export const resolveChallengeWindowPayloadSchema = roomActionPayloadSchema;
export const skipTrackWithTtPayloadSchema = roomActionPayloadSchema;
export const buyTimelineCardWithTtPayloadSchema = roomActionPayloadSchema;
export const skipTurnPayloadSchema = roomActionPayloadSchema;

export type StartGamePayload = z.input<typeof startGamePayloadSchema>;
export type StartGamePayloadParsed = z.output<typeof startGamePayloadSchema>;
export type PlaceCardPayload = z.input<typeof placeCardPayloadSchema>;
export type PlaceCardPayloadParsed = z.output<typeof placeCardPayloadSchema>;
export type ConfirmRevealPayload = z.input<typeof confirmRevealPayloadSchema>;
export type ConfirmRevealPayloadParsed = z.output<typeof confirmRevealPayloadSchema>;
export type ClaimChallengePayload = z.input<typeof claimChallengePayloadSchema>;
export type ClaimChallengePayloadParsed = z.output<typeof claimChallengePayloadSchema>;
export type PlaceChallengePayload = z.input<typeof placeChallengePayloadSchema>;
export type PlaceChallengePayloadParsed = z.output<typeof placeChallengePayloadSchema>;
export type ResolveChallengeWindowPayload = z.input<typeof resolveChallengeWindowPayloadSchema>;
export type ResolveChallengeWindowPayloadParsed = z.output<
  typeof resolveChallengeWindowPayloadSchema
>;
export type SkipTrackWithTtPayload = z.input<typeof skipTrackWithTtPayloadSchema>;
export type SkipTrackWithTtPayloadParsed = z.output<typeof skipTrackWithTtPayloadSchema>;
export type BuyTimelineCardWithTtPayload = z.input<typeof buyTimelineCardWithTtPayloadSchema>;
export type BuyTimelineCardWithTtPayloadParsed = z.output<
  typeof buyTimelineCardWithTtPayloadSchema
>;
export type SkipTurnPayload = z.input<typeof skipTurnPayloadSchema>;
export type SkipTurnPayloadParsed = z.output<typeof skipTurnPayloadSchema>;
