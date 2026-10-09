import {
  generateSpotifyCandidatesPayloadSchema,
  openSpotifyPlaylistPayloadSchema,
  playSpotifyTrackPayloadSchema,
  refreshSpotifyTokenPayloadSchema,
  registerSpotifyPlaybackDevicePayloadSchema,
  requestSpotifyAuthUrlPayloadSchema,
  searchSpotifyMusicPayloadSchema,
  searchSpotifyPlaylistsPayloadSchema,
  unregisterSpotifyPlaybackDevicePayloadSchema,
  useSpotifyCandidatesPayloadSchema,
} from "../../src/events/schemas.js";
import { SPOTIFY_QUICK_PICK_PRESET_IDS } from "../../src/spotify/spotifyQuickPicks.js";
import {
  buildIds,
  buildTracks,
  pastRoomIdLimit,
  TEST_REQUEST_ID,
  TEST_ROOM_ID,
  type SchemaCases,
} from "./schemaCase.js";

const longText = (length: number) => "x".repeat(length);
const device = { roomId: TEST_ROOM_ID, deviceId: "TEST_DEVICE_1", playbackGeneration: 0 };
const presetId = SPOTIFY_QUICK_PICK_PRESET_IDS[0];

export const spotifySchemaCases: SchemaCases = {
  requestSpotifyAuthUrlPayloadSchema: {
    schema: requestSpotifyAuthUrlPayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    edges: { "a client origin": { clientOrigin: "https://YOUR-RAILWAY-DOMAIN.example.test" } },
    pastLimits: { ...pastRoomIdLimit, "an origin that is not a URL": { clientOrigin: "origin" } },
  },
  refreshSpotifyTokenPayloadSchema: {
    schema: refreshSpotifyTokenPayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    pastLimits: pastRoomIdLimit,
  },
  playSpotifyTrackPayloadSchema: {
    schema: playSpotifyTrackPayloadSchema,
    valid: { ...device, spotifyTrackUri: "spotify:track:TEST12345", requestId: TEST_REQUEST_ID },
    edges: { "a 128-character device id": { deviceId: longText(128) } },
    pastLimits: {
      ...pastRoomIdLimit,
      "a 129-character device id": { deviceId: longText(129) },
      "an album URI": { spotifyTrackUri: "spotify:album:TEST12345" },
      "a web link": { spotifyTrackUri: "https://open.spotify.com/track/TEST12345" },
      "no request id": { requestId: undefined },
      "a negative playback generation": { playbackGeneration: -1 },
    },
  },
  registerSpotifyPlaybackDevicePayloadSchema: {
    schema: registerSpotifyPlaybackDevicePayloadSchema,
    valid: device,
    pastLimits: {
      ...pastRoomIdLimit,
      "a blank device id": { deviceId: " " },
      "a fractional playback generation": { playbackGeneration: 0.5 },
    },
  },
  unregisterSpotifyPlaybackDevicePayloadSchema: {
    schema: unregisterSpotifyPlaybackDevicePayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    pastLimits: pastRoomIdLimit,
  },
  searchSpotifyPlaylistsPayloadSchema: {
    schema: searchSpotifyPlaylistsPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, query: "80s" },
    edges: {
      "a 2-character query": { query: "ab" },
      "a 100-character query": { query: longText(100) },
      "a limit of 50": { limit: 50 },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "a 1-character query": { query: "a" },
      "a 101-character query": { query: longText(101) },
      "a limit of 0": { limit: 0 },
      "a limit of 51": { limit: 51 },
    },
    defaults: { limit: 30 },
  },
  searchSpotifyMusicPayloadSchema: {
    schema: searchSpotifyMusicPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, query: "Test Artist" },
    edges: {
      "a 120-character query": { query: longText(120) },
      "an offset of 950": { offset: 950 },
      "all three types": { types: ["track", "album", "artist"] },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "a 121-character query": { query: longText(121) },
      "a limit of 51": { limit: 51 },
      "an offset of 951": { offset: 951 },
      "no types": { types: [] },
      "four types": { types: ["track", "album", "artist", "track"] },
      "an unknown type": { types: ["podcast"] },
    },
    defaults: { limit: 20, offset: 0, types: ["track"] },
  },
  openSpotifyPlaylistPayloadSchema: {
    schema: openSpotifyPlaylistPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, playlistId: "TESTPLAYLIST12345" },
    edges: {
      "a 120-character id": { playlistId: longText(120) },
      "an album": { sourceType: "album" },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "a 121-character id": { playlistId: longText(121) },
      "an unknown source type": { sourceType: "show" },
    },
    defaults: { sourceType: "playlist" },
  },
  generateSpotifyCandidatesPayloadSchema: {
    schema: generateSpotifyCandidatesPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, source: { type: "preset", presetId, targetCount: 10 } },
    edges: {
      "500 target tracks": { source: { type: "preset", presetId, targetCount: 500 } },
      "8 playlists": { source: { type: "playlists", playlistIds: buildIds(8) } },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "9 target tracks": { source: { type: "preset", presetId, targetCount: 9 } },
      "501 target tracks": { source: { type: "preset", presetId, targetCount: 501 } },
      "an unknown preset": { source: { type: "preset", presetId: "TEST_PRESET" } },
      "no playlists": { source: { type: "playlists", playlistIds: [] } },
      "9 playlists": { source: { type: "playlists", playlistIds: buildIds(9) } },
      "an unknown source type": { source: { type: "radio" } },
    },
  },
  useSpotifyCandidatesPayloadSchema: {
    schema: useSpotifyCandidatesPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, candidateSessionId: "TEST_SESSION_1", trackIds: buildIds(10) },
    edges: {
      "500 tracks": { trackIds: buildIds(500) },
      "edited tracks": { tracks: buildTracks(10) },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "9 tracks": { trackIds: buildIds(9) },
      "501 tracks": { trackIds: buildIds(501) },
      "9 edited tracks": { tracks: buildTracks(9) },
      "a 121-character session id": { candidateSessionId: longText(121) },
    },
    defaults: { mode: "replace" },
  },
};
