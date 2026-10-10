import { act } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicTrackInfo,
} from "@tunetrack/shared/client";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listSavedPlaylists,
  savePlaylist,
} from "../../../../services/savedPlaylists/savedPlaylists";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { TEST_ROOM_ID, buildTrackCard } from "../../../../test/roomStateFixtures";
import type { UseLobbySpotifyResult } from "./lobbySpotify.types";
import { useLobbySpotify } from "./useLobbySpotify";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const GENERATED_MESSAGE_MS = 4200;
const PLAYLIST_URL = "https://open.spotify.com/playlist/TEST_PLAYLIST_1";
const OBSERVED_EVENTS = [
  ServerToClientEvent.SpotifyAuthResult,
  ServerToClientEvent.PlaylistImportResult,
  ServerToClientEvent.PlaylistTracks,
  ServerToClientEvent.RoomClosed,
];

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    ...buildTrackCard({ title: "Test Song" }),
    releaseYear: 1984,
    sourceReleaseYear: 1984,
    metadataStatus: "imported",
    ...overrides,
  };
}

function renderLobbySpotify() {
  const latest: { current: UseLobbySpotifyResult | null } = { current: null };

  function Harness() {
    latest.current = useLobbySpotify();
    return null;
  }

  const view = renderWithProviders(
    <Routes>
      <Route path="/lobby/:roomId" element={<Harness />} />
    </Routes>,
    { route: `/lobby/${TEST_ROOM_ID}` },
  );

  function result(): UseLobbySpotifyResult {
    if (!latest.current) throw new Error("hook did not render");
    return latest.current;
  }

  return { ...view, result };
}

async function flushSocket() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function serverEmit(event: string, payload?: unknown) {
  act(() => getSharedFakeSocket().serverEmit(event, payload));
}

async function applyGeneratedCandidates(result: () => UseLobbySpotifyResult, count: number) {
  act(() => result().candidates.generateCandidatesFromPreset("80s_hits"));
  await flushSocket();
  serverEmit(ServerToClientEvent.SpotifyCandidatesGenerated, {
    success: true,
    candidateSessionId: "TEST_CANDIDATE_SESSION_1",
    sourceSummary: "Test Playlist",
    tracks: [buildTrack()],
    importedCount: 1,
    filteredCount: 0,
    duplicateCount: 0,
    totalFetched: 1,
  });
  act(() => result().candidates.applyGeneratedCandidates());
  await flushSocket();
  serverEmit(ServerToClientEvent.SpotifyCandidatesApplied, { success: true, importedCount: count });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  resetSharedFakeSocket();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLobbySpotify — socket subscriptions", () => {
  it("subscribes to the lobby Spotify events after mount and unsubscribes on unmount", async () => {
    const socket = getSharedFakeSocket();
    const { unmount } = renderLobbySpotify();
    await flushSocket();

    for (const event of OBSERVED_EVENTS) {
      expect(socket.listenerCount(event)).toBe(1);
    }

    unmount();

    for (const event of OBSERVED_EVENTS) {
      expect(socket.listenerCount(event)).toBe(0);
    }
  });

  it("never subscribes when unmounted before the socket resolves", async () => {
    const socket = getSharedFakeSocket();
    const { unmount } = renderLobbySpotify();

    unmount();
    await flushSocket();

    for (const event of OBSERVED_EVENTS) {
      expect(socket.listenerCount(event)).toBe(0);
    }
  });
});

describe("useLobbySpotify — derived queue state", () => {
  it("derives the queued track ids and the Spotify ids from a playlist broadcast", async () => {
    const { result } = renderLobbySpotify();
    await flushSocket();

    serverEmit(ServerToClientEvent.PlaylistTracks, {
      tracks: [
        buildTrack({ id: "track-1", spotifyTrackUri: "spotify:track:TEST0001" }),
        {
          id: "spotify-search-TEST0002",
          title: "Test Song",
          artist: "Test Artist",
          albumTitle: "Test Album",
          releaseYear: 1990,
          metadataStatus: "imported",
        },
      ],
    });

    expect([...result().openedPlaylist.queuedTrackIds]).toEqual([
      "track-1",
      "spotify-search-TEST0002",
    ]);
    expect([...result().smartSearch.smartSearchQueuedTrackIds]).toEqual(["TEST0001", "TEST0002"]);
  });
});

describe("useLobbySpotify — wiring between sub-hooks", () => {
  it("routes the auth result to the auth state", async () => {
    const { result } = renderLobbySpotify();
    await flushSocket();

    serverEmit(ServerToClientEvent.SpotifyAuthResult, {
      success: true,
      accessToken: "TEST_ACCESS_TOKEN",
      accountType: "premium",
      expiresInSeconds: 3600,
    });

    expect(result().auth.accountType).toBe("premium");
    expect(result().auth.authPhase).toBe("idle");
  });

  it("shares the imported playlist name and URL with saving", async () => {
    const { result } = renderLobbySpotify();
    const socket = getSharedFakeSocket();
    await flushSocket();

    act(() => result().import.setPlaylistUrl(PLAYLIST_URL));
    act(() => result().import.importPlaylist());
    await flushSocket();
    expect(socket.emittedFor(ClientToServerEvent.ImportPlaylist)).toEqual([
      { roomId: TEST_ROOM_ID, playlistUrl: PLAYLIST_URL },
    ]);

    serverEmit(ServerToClientEvent.PlaylistImportResult, {
      success: true,
      importedCount: 1,
      filteredCount: 0,
      totalFetched: 1,
      playlistName: "Test Playlist",
    });
    expect(result().import.importPhase).toBe("idle");

    act(() => result().savedPlaylists.saveCurrentPlaylist());
    await flushSocket();
    serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [buildTrack()] });
    await flushSocket();

    expect(result().savedPlaylists.saveName).toBe("Test Playlist");

    act(() => result().savedPlaylists.confirmSavePlaylist());

    const [stored] = listSavedPlaylists();
    expect(stored).toMatchObject({ name: "Test Playlist", sourcePlaylistUrl: PLAYLIST_URL });
    expect(result().savedPlaylists.loadedSavedPlaylistId).toBe(stored?.id);
    expect(result().savedPlaylists.savedPlaylistMessage).toBe("Playlist saved for later.");
  });

  it("marks a saved playlist loaded once the server confirms it", async () => {
    const saved = savePlaylist({ name: "Test Playlist", tracks: [buildTrack()] });
    const { result } = renderLobbySpotify();
    await flushSocket();

    act(() => result().savedPlaylists.setSelectedSavedPlaylistId(saved?.id ?? ""));
    await flushSocket();
    serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [buildTrack()] });

    expect(result().savedPlaylists.selectedSavedPlaylistId).toBe(saved?.id);
    expect(result().savedPlaylists.loadedSavedPlaylistId).toBe(saved?.id);
    expect(result().savedPlaylists.savedPlaylistMessage).toBe(
      '"Test Playlist" loaded into this room.',
    );
    expect([...result().openedPlaylist.queuedTrackIds]).toEqual(["track-1"]);
  });

  it("forgets the loaded saved playlist when a new playlist is imported", async () => {
    const saved = savePlaylist({ name: "Test Playlist", tracks: [buildTrack()] });
    const { result } = renderLobbySpotify();
    await flushSocket();

    act(() => result().savedPlaylists.setSelectedSavedPlaylistId(saved?.id ?? ""));
    await flushSocket();
    serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [buildTrack()] });
    expect(result().savedPlaylists.loadedSavedPlaylistId).toBe(saved?.id);

    serverEmit(ServerToClientEvent.PlaylistImportResult, {
      success: true,
      importedCount: 1,
      filteredCount: 0,
      totalFetched: 1,
    });

    expect(result().savedPlaylists.loadedSavedPlaylistId).toBeNull();
  });
});

describe("useLobbySpotify — generated playlist message", () => {
  it("shows the applied message and hides it after its display time", async () => {
    const { result } = renderLobbySpotify();
    await flushSocket();

    await applyGeneratedCandidates(result, 12);

    expect(result().savedPlaylists.generatedPlaylistMessage).toBe(
      "12 generated tracks selected for this room.",
    );

    act(() => vi.advanceTimersByTime(GENERATED_MESSAGE_MS - 1));
    expect(result().savedPlaylists.generatedPlaylistMessage).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(result().savedPlaylists.generatedPlaylistMessage).toBeNull();
  });

  it("restarts the display time when a newer message replaces an older one", async () => {
    const { result } = renderLobbySpotify();
    await flushSocket();

    await applyGeneratedCandidates(result, 12);
    act(() => vi.advanceTimersByTime(3000));
    await applyGeneratedCandidates(result, 20);
    act(() => vi.advanceTimersByTime(3000));

    expect(result().savedPlaylists.generatedPlaylistMessage).toBe(
      "20 generated tracks selected for this room.",
    );

    act(() => vi.advanceTimersByTime(GENERATED_MESSAGE_MS - 3000));
    expect(result().savedPlaylists.generatedPlaylistMessage).toBeNull();
  });

  it("clears the pending hide timer on unmount", async () => {
    const { result, unmount } = renderLobbySpotify();
    await flushSocket();
    await applyGeneratedCandidates(result, 12);
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useLobbySpotify — edit modal", () => {
  it("opens and closes the queue edit modal", () => {
    const { result } = renderLobbySpotify();

    expect(result().queue.isEditModalOpen).toBe(false);
    act(() => result().queue.openEditModal());
    expect(result().queue.isEditModalOpen).toBe(true);
    act(() => result().queue.closeEditModal());
    expect(result().queue.isEditModalOpen).toBe(false);
  });
});

describe("useLobbySpotify — room closed", () => {
  it("resets the composed Spotify state when the room closes", async () => {
    const saved = savePlaylist({ name: "Test Playlist", tracks: [buildTrack()] });
    const { result } = renderLobbySpotify();
    await flushSocket();

    serverEmit(ServerToClientEvent.SpotifyAuthResult, {
      success: false,
      code: "auth_denied",
      message: "denied",
    });
    serverEmit(ServerToClientEvent.PlaylistImportResult, {
      success: false,
      code: "playlist_private",
      message: "private",
    });
    act(() => result().savedPlaylists.setSelectedSavedPlaylistId(saved?.id ?? ""));
    await flushSocket();
    serverEmit(ServerToClientEvent.PlaylistTracks, {
      tracks: [buildTrack({ spotifyTrackUri: "spotify:track:TEST0001" })],
    });
    act(() => result().savedPlaylists.startRenamePlaylist(saved?.id ?? ""));
    act(() => result().queue.openEditModal());
    await applyGeneratedCandidates(result, 12);

    expect(result().auth.authPhase).toBe("error");
    expect(result().import.importPhase).toBe("error");
    expect(result().savedPlaylists.loadedSavedPlaylistId).toBe(saved?.id);

    serverEmit(ServerToClientEvent.RoomClosed, { roomId: TEST_ROOM_ID });

    expect(result().auth.authPhase).toBe("idle");
    expect(result().auth.authError).toBeNull();
    expect(result().import.importPhase).toBe("idle");
    expect(result().import.importError).toBeNull();
    expect(result().openedPlaylist.queuedTrackIds.size).toBe(0);
    expect(result().smartSearch.smartSearchQueuedTrackIds.size).toBe(0);
    expect(result().candidates.candidatePhase).toBe("idle");
    expect(result().savedPlaylists.generatedPlaylistMessage).toBeNull();
    expect(result().savedPlaylists.renamingPlaylistId).toBeNull();
    expect(result().savedPlaylists.loadedSavedPlaylistId).toBeNull();
    expect(result().queue.isEditModalOpen).toBe(false);
  });
});
