import { act, renderHook } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicTrackInfo,
} from "@tunetrack/shared/client";
import { createElement, type MutableRefObject, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { buildTrackCard, TEST_ROOM_ID } from "../../../../test/roomStateFixtures";
import { triggerResize } from "../../../../test/stubs/observers";
import { useSpotifyPlaylistImport } from "./useSpotifyPlaylistImport";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const TEST_PLAYLIST_URL = "https://open.spotify.com/playlist/TESTPLAYLIST1";

function buildQueuedTrack(id: string, spotifyTrackId: string): PublicTrackInfo {
  return {
    ...buildTrackCard({ id, spotifyTrackUri: `spotify:track:${spotifyTrackId}` }),
    releaseYear: 1999,
    metadataStatus: "imported",
  };
}

function createParams({ roomId }: { roomId: string | undefined } = { roomId: TEST_ROOM_ID }) {
  return {
    clearPlaylistSearch: vi.fn(),
    currentPlaylistNameRef: { current: "TEST_PREVIOUS_PLAYLIST" } as MutableRefObject<
      string | undefined
    >,
    roomId,
    setLoadedSavedPlaylistId: vi.fn(),
    setQueuedTrackIds: vi.fn(),
    setSavedPlaylistMessage: vi.fn(),
    setSmartSearchQueuedTrackIds: vi.fn(),
  };
}

type ImportParams = ReturnType<typeof createParams>;

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

function renderImport(params: ImportParams) {
  return renderHook(() => useSpotifyPlaylistImport(params), { wrapper: I18nTestWrapper });
}

async function flushMicrotasks() {
  await act(async () => {});
}

beforeEach(() => {
  vi.useFakeTimers();
  resetSharedFakeSocket();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSpotifyPlaylistImport — import", () => {
  it("starts idle with an empty URL", () => {
    const { result } = renderImport(createParams());

    expect(result.current.importPhase).toBe("idle");
    expect(result.current.importError).toBeNull();
    expect(result.current.playlistUrl).toBe("");
    expect(result.current.currentPlaylistSourceUrl).toBe("");
    expect(result.current.importContentHeight).toBe(0);
  });

  it("emits the trimmed playlist URL for the room and becomes pending", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderImport(createParams());

    act(() => {
      result.current.setPlaylistUrl(`  ${TEST_PLAYLIST_URL}  `);
    });
    act(() => {
      result.current.importPlaylist();
    });
    await flushMicrotasks();

    expect(result.current.importPhase).toBe("importing");
    expect(socket.emittedFor(ClientToServerEvent.ImportPlaylist)).toEqual([
      { roomId: TEST_ROOM_ID, playlistUrl: TEST_PLAYLIST_URL },
    ]);
  });

  it("ignores a blank URL", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderImport(createParams());

    act(() => {
      result.current.setPlaylistUrl("   ");
    });
    act(() => {
      result.current.importPlaylist();
    });
    await flushMicrotasks();

    expect(result.current.importPhase).toBe("idle");
    expect(socket.emittedFor(ClientToServerEvent.ImportPlaylist)).toEqual([]);
  });

  it("ignores an import without a room", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderImport(createParams({ roomId: undefined }));

    act(() => {
      result.current.setPlaylistUrl(TEST_PLAYLIST_URL);
    });
    act(() => {
      result.current.importPlaylist();
    });
    await flushMicrotasks();

    expect(result.current.importPhase).toBe("idle");
    expect(socket.emittedFor(ClientToServerEvent.ImportPlaylist)).toEqual([]);
  });

  it("imports a search result by its playlist URL and clears the search", async () => {
    const socket = getSharedFakeSocket();
    const params = createParams();
    const { result } = renderImport(params);

    act(() => {
      result.current.importPlaylistSearchResult({
        id: "TESTPLAYLIST2",
        name: "Test Playlist Two",
        ownerName: "Player One",
        trackCount: 12,
      });
    });
    await flushMicrotasks();

    expect(socket.emittedFor(ClientToServerEvent.ImportPlaylist)).toEqual([
      { roomId: TEST_ROOM_ID, playlistUrl: "https://open.spotify.com/playlist/TESTPLAYLIST2" },
    ]);
    expect(params.clearPlaylistSearch).toHaveBeenCalledTimes(1);
    expect(result.current.importPhase).toBe("importing");
  });

  it("records the imported source and resets the editor state on success", async () => {
    const params = createParams();
    const { result } = renderImport(params);

    act(() => {
      result.current.setPlaylistUrl(TEST_PLAYLIST_URL);
    });
    act(() => {
      result.current.importPlaylist();
    });
    await flushMicrotasks();
    act(() => {
      result.current.handleImportResult({
        success: true,
        importedCount: 12,
        filteredCount: 0,
        totalFetched: 12,
        playlistName: "Test Playlist One",
      });
    });

    expect(result.current.importPhase).toBe("idle");
    expect(result.current.importError).toBeNull();
    expect(result.current.currentPlaylistSourceUrl).toBe(TEST_PLAYLIST_URL);
    expect(result.current.playlistUrl).toBe("");
    expect(params.currentPlaylistNameRef.current).toBe("Test Playlist One");
    expect(params.setLoadedSavedPlaylistId).toHaveBeenCalledWith(null);
    expect(params.setSmartSearchQueuedTrackIds).toHaveBeenCalledWith(new Set());
  });

  it("shows the localized reason and keeps the URL on failure", async () => {
    const params = createParams();
    const { result } = renderImport(params);

    act(() => {
      result.current.setPlaylistUrl(TEST_PLAYLIST_URL);
    });
    act(() => {
      result.current.importPlaylist();
    });
    await flushMicrotasks();
    act(() => {
      result.current.handleImportResult({
        success: false,
        code: "playlist_private",
        message: "TEST_SERVER_MESSAGE",
      });
    });

    expect(result.current.importPhase).toBe("error");
    expect(result.current.importError).toBe(
      "This playlist is private. Make it public on Spotify first.",
    );
    expect(result.current.playlistUrl).toBe(TEST_PLAYLIST_URL);
    expect(result.current.currentPlaylistSourceUrl).toBe("");
    expect(params.currentPlaylistNameRef.current).toBe("TEST_PREVIOUS_PLAYLIST");
    expect(params.setLoadedSavedPlaylistId).not.toHaveBeenCalled();
  });

  it("clears an import error on reset", () => {
    const { result } = renderImport(createParams());

    act(() => {
      result.current.handleImportResult({
        success: false,
        code: "invalid_url",
        message: "TEST_SERVER_MESSAGE",
      });
    });
    act(() => {
      result.current.resetImport();
    });

    expect(result.current.importPhase).toBe("idle");
    expect(result.current.importError).toBeNull();
  });
});

describe("useSpotifyPlaylistImport — clear current playlist", () => {
  it("does nothing without a room", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderImport(createParams({ roomId: undefined }));

    act(() => {
      result.current.clearCurrentPlaylist();
    });
    await flushMicrotasks();

    expect(socket.emitted).toEqual([]);
  });

  it("reports that there is nothing to clear when the queue is empty", async () => {
    const socket = getSharedFakeSocket();
    const params = createParams();
    const { result } = renderImport(params);

    act(() => {
      result.current.clearCurrentPlaylist();
    });
    await flushMicrotasks();

    expect(socket.emittedFor(ClientToServerEvent.GetPlaylistTracks)).toEqual([
      { roomId: TEST_ROOM_ID },
    ]);

    act(() => {
      socket.serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [] });
    });
    await flushMicrotasks();

    expect(params.setSavedPlaylistMessage).toHaveBeenCalledWith("No queued tracks to clear.");
    expect(socket.emittedFor(ClientToServerEvent.RemovePlaylistTracks)).toEqual([]);
    expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
  });

  it("removes every queued track and resets the playlist identity once confirmed", async () => {
    const socket = getSharedFakeSocket();
    const params = createParams();
    const { result } = renderImport(params);

    act(() => {
      result.current.setPlaylistUrl(TEST_PLAYLIST_URL);
    });
    act(() => {
      result.current.importPlaylist();
    });
    await flushMicrotasks();
    act(() => {
      result.current.handleImportResult({
        success: true,
        importedCount: 2,
        filteredCount: 0,
        totalFetched: 2,
        playlistName: "Test Playlist One",
      });
    });
    expect(result.current.currentPlaylistSourceUrl).toBe(TEST_PLAYLIST_URL);
    params.setLoadedSavedPlaylistId.mockClear();

    act(() => {
      result.current.clearCurrentPlaylist();
    });
    await flushMicrotasks();
    act(() => {
      socket.serverEmit(ServerToClientEvent.PlaylistTracks, {
        tracks: [
          buildQueuedTrack("track-1", "TEST0000000000000001"),
          buildQueuedTrack("track-2", "TEST0000000000000002"),
        ],
      });
    });
    await flushMicrotasks();

    expect(socket.emittedFor(ClientToServerEvent.RemovePlaylistTracks)).toEqual([
      { roomId: TEST_ROOM_ID, trackIds: ["track-1", "track-2"] },
    ]);
    expect(params.setSavedPlaylistMessage).not.toHaveBeenCalled();

    const remaining = [buildQueuedTrack("track-3", "TEST0000000000000003")];
    act(() => {
      socket.serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: remaining });
    });

    expect(params.setQueuedTrackIds).toHaveBeenCalledWith(new Set(["track-3"]));
    expect(params.setSmartSearchQueuedTrackIds).toHaveBeenLastCalledWith(
      new Set(["TEST0000000000000003"]),
    );
    expect(params.setLoadedSavedPlaylistId).toHaveBeenCalledWith(null);
    expect(params.currentPlaylistNameRef.current).toBeUndefined();
    expect(result.current.currentPlaylistSourceUrl).toBe("");
    expect(params.setSavedPlaylistMessage).toHaveBeenCalledWith("Playlist cleared.");
    expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
  });
});

describe("useSpotifyPlaylistImport — import panel height", () => {
  it("measures the import content and follows its resizes", async () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get");
    scrollHeight.mockReturnValue(240);
    onTestFinished(() => scrollHeight.mockRestore());
    const latest: { current: ReturnType<typeof useSpotifyPlaylistImport> | null } = {
      current: null,
    };
    const params = createParams();

    function ImportPanelHarness() {
      const importState = useSpotifyPlaylistImport(params);
      latest.current = importState;
      return <div ref={importState.importContentRef} />;
    }

    const { unmount } = renderWithProviders(<ImportPanelHarness />, { withRouter: false });
    await flushMicrotasks();

    expect(latest.current?.importContentHeight).toBe(240);

    scrollHeight.mockReturnValue(320);
    act(() => {
      triggerResize();
    });

    expect(latest.current?.importContentHeight).toBe(320);

    unmount();
    scrollHeight.mockReturnValue(400);
    act(() => {
      triggerResize();
    });

    expect(latest.current?.importContentHeight).toBe(320);
  });
});
