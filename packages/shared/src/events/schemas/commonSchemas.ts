import { z } from "zod";
import {
  MIN_RELEASE_YEAR,
  PRACTICE_COVER_PATH_PREFIX,
  ROOM_CODE_MAX_LENGTH,
  ROOM_CODE_MIN_LENGTH,
} from "../../constants/gameplay.js";
import type { RevealConfirmMode } from "../../game/roomSettings.js";
import type { TrackMetadataStatus } from "../../game/track.js";

export const roomIdSchema = z
  .string()
  .trim()
  .min(ROOM_CODE_MIN_LENGTH)
  .max(ROOM_CODE_MAX_LENGTH)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const optionalRequestIdSchema = z.string().uuid().optional();

export const playerIdSchema = z.string().trim().min(1);

export const revealConfirmModeSchema = z.enum([
  "host_only",
  "host_or_active_player",
]) satisfies z.ZodType<RevealConfirmMode>;

export const trackMetadataStatusSchema = z.enum([
  "imported",
  "edited",
  "verified",
]) satisfies z.ZodType<TrackMetadataStatus>;

export const releaseYearSchema = z
  .number()
  .int()
  .min(MIN_RELEASE_YEAR)
  .max(new Date().getFullYear() + 1);

export const playlistQueueUpdateModeSchema = z.enum(["append", "replace"]);

// Rendered as <img>/<audio> src on every player's device, so only https media is accepted.
const httpsMediaUrlSchema = z
  .string()
  .trim()
  .url()
  .max(1_000)
  .refine(isHttpsUrl, { message: "URL must use https." });

// Zod still runs this refinement after `.url()` fails, so an unparsable value must not throw.
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// Same-origin static files only, so the exact shape is pinned rather than any relative path.
const practiceCoverPathSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^${PRACTICE_COVER_PATH_PREFIX}[a-z0-9-]+\\.svg$`));

export const curatedPlaylistTrackSchema = z.object({
  id: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  albumTitle: z.string().trim().min(1).max(200),
  releaseYear: releaseYearSchema,
  sourceReleaseYear: releaseYearSchema.optional(),
  metadataStatus: trackMetadataStatusSchema.default("imported"),
  artworkUrl: z.union([httpsMediaUrlSchema, practiceCoverPathSchema]).optional(),
  previewUrl: httpsMediaUrlSchema.optional(),
  spotifyTrackUri: z.string().trim().min(1).max(300).optional(),
});

/** A track the host curated on the device, as the client sends it. */
export type CuratedPlaylistTrackPayload = z.input<typeof curatedPlaylistTrackSchema>;

/** A payload that only names the room (and optionally a request id for replay). */
export const roomActionPayloadSchema = z.object({
  roomId: roomIdSchema,
  requestId: optionalRequestIdSchema,
});
