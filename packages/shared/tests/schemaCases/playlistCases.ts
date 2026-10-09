import {
  getPlaylistTracksPayloadSchema,
  importPlaylistPayloadSchema,
  loadCuratedPlaylistPayloadSchema,
  removePlaylistTracksPayloadSchema,
  updatePlaylistTrackPayloadSchema,
} from "../../src/events/schemas.js";
import {
  buildIds,
  buildTrack,
  buildTracks,
  nextYear,
  pastRoomIdLimit,
  TEST_ROOM_ID,
  type SchemaCases,
} from "./schemaCase.js";

const longText = (length: number) => "x".repeat(length);

export const playlistSchemaCases: SchemaCases = {
  importPlaylistPayloadSchema: {
    schema: importPlaylistPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, playlistUrl: "spotify:playlist:TESTPLAYLIST1234567890" },
    edges: { "a 500-character link": { playlistUrl: longText(500) } },
    pastLimits: {
      ...pastRoomIdLimit,
      "a 501-character link": { playlistUrl: longText(501) },
      "a blank link": { playlistUrl: " " },
    },
  },
  loadCuratedPlaylistPayloadSchema: {
    schema: loadCuratedPlaylistPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, tracks: [buildTrack(1)] },
    edges: {
      "1000 tracks": { tracks: buildTracks(1_000) },
      "a 200-character title": { tracks: [buildTrack(1, { title: longText(200) })] },
      "the year 1900": { tracks: [buildTrack(1, { releaseYear: 1900 })] },
      "next year": { tracks: [buildTrack(1, { releaseYear: nextYear })] },
      "https artwork": {
        tracks: [buildTrack(1, { artworkUrl: "https://images.example.test/a.jpg" })],
      },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "no tracks": { tracks: [] },
      "1001 tracks": { tracks: buildTracks(1_001) },
      "a 201-character title": { tracks: [buildTrack(1, { title: longText(201) })] },
      "the year 1899": { tracks: [buildTrack(1, { releaseYear: 1899 })] },
      "the year after next": { tracks: [buildTrack(1, { releaseYear: nextYear + 1 })] },
      "http artwork": {
        tracks: [buildTrack(1, { artworkUrl: "http://images.example.test/a.jpg" })],
      },
      "an unknown metadata status": { tracks: [buildTrack(1, { metadataStatus: "approved" })] },
      "an unknown queue mode": { mode: "merge" },
    },
    defaults: { mode: "replace" },
  },
  getPlaylistTracksPayloadSchema: {
    schema: getPlaylistTracksPayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    pastLimits: pastRoomIdLimit,
  },
  removePlaylistTracksPayloadSchema: {
    schema: removePlaylistTracksPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, trackIds: ["track-1"] },
    edges: { "500 tracks": { trackIds: buildIds(500) } },
    pastLimits: {
      ...pastRoomIdLimit,
      "no tracks": { trackIds: [] },
      "501 tracks": { trackIds: buildIds(501) },
      "a blank track id": { trackIds: [" "] },
    },
  },
  updatePlaylistTrackPayloadSchema: {
    schema: updatePlaylistTrackPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, trackId: "track-1", releaseYear: 1979 },
    edges: {
      "only a status": { releaseYear: undefined, metadataStatus: "verified" },
      "a 200-character artist": { artist: longText(200) },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "no field to change": { releaseYear: undefined },
      "a 201-character artist": { artist: longText(201) },
      "the year 1899": { releaseYear: 1899 },
      "a blank track id": { trackId: "" },
    },
  },
};
