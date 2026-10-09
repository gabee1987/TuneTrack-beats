import { describe, expect, it } from "vitest";
import type { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import type { SpotifyApiTrack } from "../../src/spotify/spotifyApiTypes.js";
import { SpotifyCandidateGenerator } from "../../src/spotify/SpotifyCandidateGenerator.js";
import type { SpotifyCatalogClient } from "../../src/spotify/SpotifyCatalogClient.js";
import { SpotifyClientCredentials } from "../../src/spotify/SpotifyClientCredentials.js";
import { SpotifyPlaylistSearch } from "../../src/spotify/SpotifyPlaylistSearch.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

const ROOM_ID = "TEST_ROOM_1";
const TRACKS_PER_PLAYLIST = 12;

function buildPlaylistTracks(playlistId: string): SpotifyApiTrack[] {
  return Array.from({ length: TRACKS_PER_PLAYLIST }, (_, index) => ({
    id: `${playlistId}-track-${index + 1}`,
    name: `Test Song ${index + 1}`,
    artists: [{ name: `Test Artist ${playlistId}` }],
    album: { name: "Test Album", release_date: `${1980 + index}-01-01`, images: [] },
    preview_url: null,
    uri: `spotify:track:TEST${index + 1}`,
  }));
}

function createCandidateGenerator() {
  const fetches = { inFlight: 0, maxInFlight: 0 };
  const apiClient = {
    getAllPlaylistTracks: async (playlistId: string) => {
      fetches.inFlight += 1;
      fetches.maxInFlight = Math.max(fetches.maxInFlight, fetches.inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      fetches.inFlight -= 1;
      return buildPlaylistTracks(playlistId);
    },
  } as unknown as SpotifyCatalogClient;
  const tokenStore = new SpotifyTokenStore();
  tokenStore.setClientCredentials("client-token", 3600);
  const credentials = new SpotifyClientCredentials({} as SpotifyAccountsClient, tokenStore);
  const playlistSearch = new SpotifyPlaylistSearch(apiClient, credentials);
  return {
    discovery: new SpotifyCandidateGenerator(apiClient, credentials, playlistSearch),
    fetches,
  };
}

async function generateSession(discovery: SpotifyCandidateGenerator, playlistId: string) {
  const { payload } = await discovery.generateFromPlaylists(ROOM_ID, [playlistId], 10);
  if (!payload.success) throw new Error(payload.message);
  return payload;
}

describe("SpotifyCandidateGenerator limits", () => {
  it("fetches at most three playlists at a time and keeps their order", async () => {
    const { discovery, fetches } = createCandidateGenerator();
    const playlistIds = Array.from({ length: 8 }, (_, index) => `playlist${index + 1}`);

    const { payload } = await discovery.generateFromPlaylists(ROOM_ID, playlistIds, 200);

    expect(fetches.maxInFlight).toBe(3);
    expect(payload.success && payload.tracks[0]?.id).toBe("playlist1-track-1");
  });

  it("keeps three candidate sessions per room and evicts the oldest", async () => {
    const { discovery } = createCandidateGenerator();
    const sessions: Awaited<ReturnType<typeof generateSession>>[] = [];
    for (const playlistId of ["playlistA", "playlistB", "playlistC", "playlistD"]) {
      sessions.push(await generateSession(discovery, playlistId));
    }

    const [oldest, ...kept] = sessions;
    const applyAll = (session: (typeof sessions)[number]) =>
      discovery.applyCandidates(
        ROOM_ID,
        session.candidateSessionId,
        session.tracks.map((track) => track.id),
      ).payload.success;

    expect(oldest && applyAll(oldest)).toBe(false);
    expect(kept.map(applyAll)).toEqual([true, true, true]);
  });
});
