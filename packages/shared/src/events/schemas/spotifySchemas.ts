import { z } from "zod";
import { MIN_PLAYLIST_TRACK_COUNT } from "../../constants/gameplay.js";
import { SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT } from "../../spotify/spotifyDiscovery.js";
import { SPOTIFY_QUICK_PICK_PRESET_IDS } from "../../spotify/spotifyQuickPicks.js";
import {
  curatedPlaylistTrackSchema,
  playlistQueueUpdateModeSchema,
  roomIdSchema,
} from "./commonSchemas.js";

const MAX_SPOTIFY_PLAYLIST_SEARCH_LIMIT = 50;
const MAX_SPOTIFY_CANDIDATE_PLAYLIST_COUNT = 8;
const MAX_SPOTIFY_SMART_SEARCH_OFFSET = 950;

const spotifySmartSearchTypeSchema = z.enum(["track", "album", "artist"]);
const playbackDeviceIdSchema = z.string().trim().min(1).max(128);
const playbackGenerationSchema = z.number().int().nonnegative();
const candidateTargetCountSchema = z
  .number()
  .int()
  .min(MIN_PLAYLIST_TRACK_COUNT)
  .max(SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT)
  .default(SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT);

export const requestSpotifyAuthUrlPayloadSchema = z.object({
  roomId: roomIdSchema,
  clientOrigin: z.string().url().optional(),
});

export const refreshSpotifyTokenPayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const playSpotifyTrackPayloadSchema = z.object({
  roomId: roomIdSchema,
  deviceId: playbackDeviceIdSchema,
  spotifyTrackUri: z
    .string()
    .trim()
    .regex(/^spotify:track:[A-Za-z0-9]+$/, "Invalid Spotify track URI"),
  requestId: z.string().uuid(),
  playbackGeneration: playbackGenerationSchema,
});

export const registerSpotifyPlaybackDevicePayloadSchema = z.object({
  roomId: roomIdSchema,
  deviceId: playbackDeviceIdSchema,
  playbackGeneration: playbackGenerationSchema,
});

export const unregisterSpotifyPlaybackDevicePayloadSchema = z.object({
  roomId: roomIdSchema,
});

export const searchSpotifyPlaylistsPayloadSchema = z.object({
  roomId: roomIdSchema,
  query: z.string().trim().min(2).max(100),
  limit: z.number().int().min(1).max(MAX_SPOTIFY_PLAYLIST_SEARCH_LIMIT).default(30),
});

export const searchSpotifyMusicPayloadSchema = z.object({
  roomId: roomIdSchema,
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).max(MAX_SPOTIFY_SMART_SEARCH_OFFSET).default(0),
  types: z.array(spotifySmartSearchTypeSchema).min(1).max(3).default(["track"]),
});

export const openSpotifyPlaylistPayloadSchema = z.object({
  roomId: roomIdSchema,
  playlistId: z.string().trim().min(1).max(120),
  sourceType: z.enum(["playlist", "album", "artist"]).default("playlist"),
});

export const generateSpotifyCandidatesPayloadSchema = z.object({
  roomId: roomIdSchema,
  source: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("playlists"),
      playlistIds: z
        .array(z.string().trim().min(1).max(100))
        .min(1)
        .max(MAX_SPOTIFY_CANDIDATE_PLAYLIST_COUNT),
      targetCount: candidateTargetCountSchema,
    }),
    z.object({
      type: z.literal("preset"),
      presetId: z.enum(SPOTIFY_QUICK_PICK_PRESET_IDS),
      targetCount: candidateTargetCountSchema,
    }),
  ]),
});

export const useSpotifyCandidatesPayloadSchema = z.object({
  roomId: roomIdSchema,
  candidateSessionId: z.string().trim().min(1).max(120),
  trackIds: z
    .array(z.string().trim().min(1).max(200))
    .min(MIN_PLAYLIST_TRACK_COUNT)
    .max(SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT),
  tracks: z
    .array(curatedPlaylistTrackSchema)
    .min(MIN_PLAYLIST_TRACK_COUNT)
    .max(SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT)
    .optional(),
  mode: playlistQueueUpdateModeSchema.default("replace"),
});

export type RequestSpotifyAuthUrlPayload = z.input<typeof requestSpotifyAuthUrlPayloadSchema>;
export type RequestSpotifyAuthUrlPayloadParsed = z.output<
  typeof requestSpotifyAuthUrlPayloadSchema
>;
export type RefreshSpotifyTokenPayload = z.input<typeof refreshSpotifyTokenPayloadSchema>;
export type RefreshSpotifyTokenPayloadParsed = z.output<typeof refreshSpotifyTokenPayloadSchema>;
export type PlaySpotifyTrackPayload = z.input<typeof playSpotifyTrackPayloadSchema>;
export type PlaySpotifyTrackPayloadParsed = z.output<typeof playSpotifyTrackPayloadSchema>;
export type RegisterSpotifyPlaybackDevicePayload = z.input<
  typeof registerSpotifyPlaybackDevicePayloadSchema
>;
export type RegisterSpotifyPlaybackDevicePayloadParsed = z.output<
  typeof registerSpotifyPlaybackDevicePayloadSchema
>;
export type UnregisterSpotifyPlaybackDevicePayload = z.input<
  typeof unregisterSpotifyPlaybackDevicePayloadSchema
>;
export type UnregisterSpotifyPlaybackDevicePayloadParsed = z.output<
  typeof unregisterSpotifyPlaybackDevicePayloadSchema
>;
export type SearchSpotifyPlaylistsPayload = z.input<typeof searchSpotifyPlaylistsPayloadSchema>;
export type SearchSpotifyPlaylistsPayloadParsed = z.output<
  typeof searchSpotifyPlaylistsPayloadSchema
>;
export type SearchSpotifyMusicPayload = z.input<typeof searchSpotifyMusicPayloadSchema>;
export type SearchSpotifyMusicPayloadParsed = z.output<typeof searchSpotifyMusicPayloadSchema>;
export type OpenSpotifyPlaylistPayload = z.input<typeof openSpotifyPlaylistPayloadSchema>;
export type OpenSpotifyPlaylistPayloadParsed = z.output<typeof openSpotifyPlaylistPayloadSchema>;
export type GenerateSpotifyCandidatesPayload = z.input<
  typeof generateSpotifyCandidatesPayloadSchema
>;
export type GenerateSpotifyCandidatesPayloadParsed = z.output<
  typeof generateSpotifyCandidatesPayloadSchema
>;
export type UseSpotifyCandidatesPayload = z.input<typeof useSpotifyCandidatesPayloadSchema>;
export type UseSpotifyCandidatesPayloadParsed = z.output<typeof useSpotifyCandidatesPayloadSchema>;
