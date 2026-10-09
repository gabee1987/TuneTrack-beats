import { z } from "zod";
import {
  curatedPlaylistTrackSchema,
  playlistQueueUpdateModeSchema,
  releaseYearSchema,
  roomIdSchema,
  trackMetadataStatusSchema,
} from "./commonSchemas.js";

const MAX_CURATED_PLAYLIST_TRACK_COUNT = 1_000;

export const importPlaylistPayloadSchema = z.object({
  roomId: roomIdSchema,
  playlistUrl: z.string().trim().min(1).max(500),
});

export const loadCuratedPlaylistPayloadSchema = z.object({
  roomId: roomIdSchema,
  tracks: z.array(curatedPlaylistTrackSchema).min(1).max(MAX_CURATED_PLAYLIST_TRACK_COUNT),
  mode: playlistQueueUpdateModeSchema.default("replace"),
});

export const getPlaylistTracksPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const removePlaylistTracksPayloadSchema = z.object({
  roomId: roomIdSchema,
  trackIds: z.array(z.string().trim().min(1)).min(1).max(500),
});

export const updatePlaylistTrackPayloadSchema = z
  .object({
    roomId: roomIdSchema,
    trackId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(200).optional(),
    artist: z.string().trim().min(1).max(200).optional(),
    albumTitle: z.string().trim().min(1).max(200).optional(),
    releaseYear: releaseYearSchema.optional(),
    metadataStatus: trackMetadataStatusSchema.optional(),
  })
  .refine(
    (payload) =>
      payload.title !== undefined ||
      payload.artist !== undefined ||
      payload.albumTitle !== undefined ||
      payload.releaseYear !== undefined ||
      payload.metadataStatus !== undefined,
  );

export type ImportPlaylistPayload = z.input<typeof importPlaylistPayloadSchema>;
export type ImportPlaylistPayloadParsed = z.output<typeof importPlaylistPayloadSchema>;
export type LoadCuratedPlaylistPayload = z.input<typeof loadCuratedPlaylistPayloadSchema>;
export type LoadCuratedPlaylistPayloadParsed = z.output<typeof loadCuratedPlaylistPayloadSchema>;
export type GetPlaylistTracksPayload = z.input<typeof getPlaylistTracksPayloadSchema>;
export type GetPlaylistTracksPayloadParsed = z.output<typeof getPlaylistTracksPayloadSchema>;
export type RemovePlaylistTracksPayload = z.input<typeof removePlaylistTracksPayloadSchema>;
export type RemovePlaylistTracksPayloadParsed = z.output<typeof removePlaylistTracksPayloadSchema>;
export type UpdatePlaylistTrackPayload = z.input<typeof updatePlaylistTrackPayloadSchema>;
export type UpdatePlaylistTrackPayloadParsed = z.output<typeof updatePlaylistTrackPayloadSchema>;
