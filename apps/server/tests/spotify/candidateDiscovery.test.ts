import {
  MIN_PLAYLIST_TRACK_COUNT,
  type SpotifyCandidatesGeneratedPayload,
} from "@tunetrack/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import type { SpotifyApiTrack } from "../../src/spotify/spotifyApiTypes.js";
import { SpotifyCandidateGenerator } from "../../src/spotify/SpotifyCandidateGenerator.js";
import { SpotifyPlaylistSearch } from "../../src/spotify/SpotifyPlaylistSearch.js";
import {
  asCatalogClient,
  createAppCredentials,
  createFakeCatalog,
  spotifyPlaylist,
  spotifyTrack,
  type FakeCatalog,
} from "../support/fakeSpotifyCatalog.js";

/** Candidate selection and mapping from a fake catalogue (06 T6, "discovery"). */
const ROOM_ID = "TEST_ROOM_1";

let catalog: FakeCatalog;
let generator: SpotifyCandidateGenerator;

beforeEach(() => {
  catalog = createFakeCatalog();
  const credentials = createAppCredentials();
  generator = new SpotifyCandidateGenerator(
    asCatalogClient(catalog),
    credentials,
    new SpotifyPlaylistSearch(asCatalogClient(catalog), credentials),
  );
  vi.spyOn(logger, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function tracksForYears(prefix: string, years: number[]): SpotifyApiTrack[] {
  return years.map((year, index) =>
    spotifyTrack(`${prefix}${index}`, `${year}-01-01`, { name: `Test Song ${prefix}${index}` }),
  );
}

function decade(prefix: string, startYear: number): SpotifyApiTrack[] {
  return tracksForYears(
    prefix,
    Array.from({ length: 10 }, (_, index) => startYear + index),
  );
}

function expectGenerated(payload: SpotifyCandidatesGeneratedPayload) {
  if (!payload.success) throw new Error(`generation failed: ${payload.code}`);
  return payload;
}

describe("candidates from playlists", () => {
  it("refuses a request without a playlist id", async () => {
    const { payload } = await generator.generateFromPlaylists(ROOM_ID, [" ", ""], 20);

    expect(payload).toMatchObject({ success: false, code: "invalid_source" });
    expect(catalog.getAllPlaylistTracks).not.toHaveBeenCalled();
  });

  it("fetches each playlist once and counts unusable and duplicate tracks", async () => {
    catalog.getAllPlaylistTracks.mockImplementation(async (playlistId) =>
      playlistId === "p1"
        ? [...decade("a", 1980), spotifyTrack("bad", "unknown")]
        : [spotifyTrack("a0", "1980-01-01"), ...decade("b", 1990)],
    );

    const payload = expectGenerated(
      (await generator.generateFromPlaylists(ROOM_ID, ["p1", " p2 ", "p1"], 50)).payload,
    );

    expect(catalog.getAllPlaylistTracks).toHaveBeenCalledTimes(2);
    expect(payload).toMatchObject({
      sourceSummary: "2 Spotify playlists",
      importedCount: 20,
      filteredCount: 1,
      duplicateCount: 1,
      totalFetched: 22,
    });
    expect(payload.tracks[0]).toMatchObject({ id: "a0", metadataStatus: "imported" });
  });

  it("stops at the target count in playlist order", async () => {
    catalog.getAllPlaylistTracks.mockResolvedValue([...decade("a", 1980), ...decade("b", 1990)]);

    const payload = expectGenerated(
      (await generator.generateFromPlaylists(ROOM_ID, ["p1"], 12)).payload,
    );

    expect(payload.sourceSummary).toBe("1 Spotify playlist");
    expect(payload.tracks.map((track) => track.id)).toEqual([
      ...decade("a", 1980).map((track) => track.id),
      "b0",
      "b1",
    ]);
  });

  it(`refuses fewer than ${MIN_PLAYLIST_TRACK_COUNT} usable tracks`, async () => {
    catalog.getAllPlaylistTracks.mockResolvedValue(tracksForYears("a", [1980, 1981, 1982]));

    const { payload } = await generator.generateFromPlaylists(ROOM_ID, ["p1"], 20);

    expect(payload).toMatchObject({
      success: false,
      code: "too_few_tracks",
      message: expect.stringContaining("Only 3 usable tracks"),
    });
  });

  it("answers a Spotify failure with a client-safe message", async () => {
    catalog.getAllPlaylistTracks.mockRejectedValue(new Error("UPSTREAM_DETAIL"));

    const { payload } = await generator.generateFromPlaylists(ROOM_ID, ["p1"], 20);

    expect(payload).toEqual({
      success: false,
      code: "spotify_api_error",
      message: "Could not generate tracks from those playlists. Please try again.",
    });
  });
});

describe("candidates from a Quick Pick", () => {
  it("refuses an unknown preset", async () => {
    const { payload } = await generator.generateCandidates(ROOM_ID, {
      type: "preset",
      presetId: "TEST_UNKNOWN" as "80s_hits",
      targetCount: 20,
    });

    expect(payload).toMatchObject({ success: false, code: "invalid_source" });
  });

  it("keeps the preset's decade, balances years and alternates playlists", async () => {
    catalog.searchPlaylists.mockImplementation(async (query) =>
      query === "80s pop hits" ? [spotifyPlaylist("p1"), spotifyPlaylist("p2")] : [],
    );
    catalog.getAllPlaylistTracks.mockImplementation(async (playlistId) =>
      playlistId === "p1"
        ? [...tracksForYears("a", [1980, 1980, 1980, 1980, 1980, 1975]), ...decade("c", 1990)]
        : decade("b", 1980),
    );

    const payload = expectGenerated(
      (
        await generator.generateCandidates(ROOM_ID, {
          type: "preset",
          presetId: "80s_hits",
          targetCount: 12,
        })
      ).payload,
    );

    expect(payload.sourceSummary).toBe("80s Hits Quick Pick");
    expect(
      payload.tracks.every((track) => track.releaseYear >= 1980 && track.releaseYear <= 1989),
    ).toBe(true);
    expect(payload.tracks.map((track) => track.releaseYear)).toEqual([
      1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1980, 1980,
    ]);
    expect(catalog.getAllPlaylistTracks.mock.calls.map(([playlistId]) => playlistId)).toEqual([
      "p1",
      "p2",
    ]);
  });

  it("asks for more playlists when Spotify finds none", async () => {
    const { payload } = await generator.generateCandidates(ROOM_ID, {
      type: "preset",
      presetId: "80s_hits",
      targetCount: 20,
    });

    expect(payload).toMatchObject({ success: false, code: "too_few_tracks" });
    expect(catalog.getAllPlaylistTracks).not.toHaveBeenCalled();
  });

  it("answers a failed playlist search with a client-safe message", async () => {
    catalog.searchPlaylists.mockRejectedValue(new Error("UPSTREAM_DETAIL"));

    const { payload } = await generator.generateCandidates(ROOM_ID, {
      type: "preset",
      presetId: "80s_hits",
      targetCount: 20,
    });

    expect(payload).toMatchObject({ success: false, code: "spotify_api_error" });
  });
});

describe("applying candidates", () => {
  async function generateSession() {
    catalog.getAllPlaylistTracks.mockResolvedValue(decade("a", 1980));
    return expectGenerated(
      (
        await generator.generateCandidates(ROOM_ID, {
          type: "playlists",
          playlistIds: ["p1"],
          targetCount: 20,
        })
      ).payload,
    );
  }

  it("refuses a session from another room or one that never existed", async () => {
    const session = await generateSession();
    const allIds = session.tracks.map((track) => track.id);

    expect(
      generator.applyCandidates("TEST_ROOM_2", session.candidateSessionId, allIds).cards,
    ).toBeNull();
    expect(
      generator.applyCandidates(ROOM_ID, "TEST_SESSION_UNKNOWN", allIds).payload,
    ).toMatchObject({
      success: false,
      code: "candidate_session_expired",
    });
  });

  it(`refuses a selection below ${MIN_PLAYLIST_TRACK_COUNT} tracks and keeps the session`, async () => {
    const session = await generateSession();
    const allIds = session.tracks.map((track) => track.id);

    const tooFew = generator.applyCandidates(ROOM_ID, session.candidateSessionId, allIds.slice(1));

    expect(tooFew.payload).toMatchObject({ success: false, code: "too_few_tracks" });
    expect(generator.applyCandidates(ROOM_ID, session.candidateSessionId, allIds).payload).toEqual({
      success: true,
      importedCount: 10,
    });
  });

  it("applies the host's edits and consumes the session", async () => {
    const session = await generateSession();
    const allIds = session.tracks.map((track) => track.id);

    const applied = generator.applyCandidates(ROOM_ID, session.candidateSessionId, allIds, [
      {
        id: "a0",
        title: "Edited Song",
        artist: "Edited Artist",
        albumTitle: "Edited Album",
        releaseYear: 1975,
        metadataStatus: "verified",
      },
    ]);

    expect(applied.cards?.[0]).toMatchObject({
      id: "a0",
      title: "Edited Song",
      releaseYear: 1975,
      sourceReleaseYear: 1980,
      metadataStatus: "verified",
    });
    expect(generator.applyCandidates(ROOM_ID, session.candidateSessionId, allIds).cards).toBeNull();
  });

  it("follows a renamed room", async () => {
    const session = await generateSession();
    generator.retargetRoom(ROOM_ID, "TEST_ROOM_2");

    const applied = generator.applyCandidates(
      "TEST_ROOM_2",
      session.candidateSessionId,
      session.tracks.map((track) => track.id),
    );

    expect(applied.payload.success).toBe(true);
  });
});
