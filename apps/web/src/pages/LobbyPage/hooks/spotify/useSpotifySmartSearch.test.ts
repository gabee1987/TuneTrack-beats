import { act, renderHook } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicTrackInfo,
  type SpotifySmartSearchResult,
} from "@tunetrack/shared/client";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { TEST_ROOM_ID } from "../../../../test/roomStateFixtures";
import { useSpotifySmartSearch } from "./useSpotifySmartSearch";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const socket = getSharedFakeSocket();

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

function buildTrackResult(id: string): SpotifySmartSearchResult {
  return {
    id,
    type: "track",
    title: "Test Song",
    subtitle: "Test Artist",
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear: 1999,
    spotifyUri: `spotify:track:${id}`,
  };
}

const TRACK_ONE = buildTrackResult("TESTTRACK1");
const TRACK_TWO = buildTrackResult("TESTTRACK2");
const ALBUM_RESULT: SpotifySmartSearchResult = {
  id: "TESTALBUM1",
  type: "album",
  title: "Test Album",
  subtitle: "Test Artist",
};

function queuedTrack(id: string): PublicTrackInfo {
  return {
    id,
    title: "Test Song",
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear: 1999,
    metadataStatus: "imported",
    spotifyTrackUri: `spotify:track:${id}`,
  };
}

interface RenderOptions {
  roomId?: string | undefined;
  smartSearchQueuedTrackIds?: ReadonlySet<string>;
}

function renderSmartSearch(options: RenderOptions = {}) {
  const params = {
    closeOpenedPlaylist: vi.fn(),
    roomId: "roomId" in options ? options.roomId : TEST_ROOM_ID,
    setQueuedTrackIds: vi.fn(),
    setSavedPlaylistMessage: vi.fn(),
    setSmartSearchQueuedTrackIds: vi.fn(),
    smartSearchQueuedTrackIds: options.smartSearchQueuedTrackIds ?? new Set<string>(),
  };
  const view = renderHook(() => useSpotifySmartSearch(params), { wrapper: I18nTestWrapper });
  return { ...view, params };
}

type SmartSearchView = ReturnType<typeof renderSmartSearch>;

async function search(view: SmartSearchView, query = "test song") {
  act(() => view.result.current.setSmartSearchQuery(query));
  await act(async () => view.result.current.searchSpotifyMusic());
}

function emitSearchResult(overrides: Record<string, unknown> = {}) {
  act(() => {
    socket.serverEmit(ServerToClientEvent.SpotifySmartSearchResult, {
      success: true,
      query: "test song",
      parsed: {
        rawQuery: "test song",
        normalizedQuery: "test song",
        kind: "mixed_search",
        queryWithoutQualifiers: "test song",
      },
      results: [TRACK_ONE],
      offset: 0,
      limit: 20,
      hasMore: true,
      nextOffset: 20,
      ...overrides,
    });
  });
}

beforeEach(() => {
  resetSharedFakeSocket();
});

describe("useSpotifySmartSearch", () => {
  it("starts idle on the track filter with no results", () => {
    const { result } = renderSmartSearch();

    expect(result.current.smartSearchPhase).toBe("idle");
    expect(result.current.smartSearchLoadMorePhase).toBe("idle");
    expect(result.current.smartSearchType).toBe("track");
    expect(result.current.smartSearchQuery).toBe("");
    expect(result.current.smartSearchResults).toEqual([]);
    expect(result.current.smartSearchHasSearched).toBe(false);
  });

  describe("searching", () => {
    it("does not search a query shorter than two characters", async () => {
      const view = renderSmartSearch();

      await search(view, " a ");

      expect(view.result.current.smartSearchPhase).toBe("idle");
      expect(socket.emitted).toEqual([]);
    });

    it("does not search without a room", async () => {
      const view = renderSmartSearch({ roomId: undefined });

      await search(view);

      expect(view.result.current.smartSearchPhase).toBe("idle");
      expect(socket.emitted).toEqual([]);
    });

    it("sends the trimmed query for the current type from offset zero", async () => {
      const view = renderSmartSearch();

      await search(view, "  test song  ");

      expect(view.result.current.smartSearchPhase).toBe("searching");
      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(null);
      expect(socket.emittedFor(ClientToServerEvent.SearchSpotifyMusic)).toEqual([
        { roomId: TEST_ROOM_ID, query: "test song", limit: 20, offset: 0, types: ["track"] },
      ]);
      expect(socket.listenerCount(ServerToClientEvent.SpotifySmartSearchResult)).toBe(1);
    });

    it("searches by an explicit type and keeps that type selected", async () => {
      const view = renderSmartSearch();
      act(() => view.result.current.setSmartSearchQuery("test artist"));

      await act(async () => view.result.current.searchSpotifyMusicByType("artist"));

      expect(view.result.current.smartSearchType).toBe("artist");
      expect(socket.emittedFor(ClientToServerEvent.SearchSpotifyMusic)).toEqual([
        expect.objectContaining({ query: "test artist", types: ["artist"] }),
      ]);
    });

    it("stores the results and paging state and stops listening on success", async () => {
      const view = renderSmartSearch();
      await search(view);

      emitSearchResult();

      expect(view.result.current.smartSearchPhase).toBe("idle");
      expect(view.result.current.smartSearchHasSearched).toBe(true);
      expect(view.result.current.smartSearchHasMore).toBe(true);
      expect(view.result.current.smartSearchResults).toEqual([TRACK_ONE]);
      expect(socket.listenerCount(ServerToClientEvent.SpotifySmartSearchResult)).toBe(0);
    });

    it("replaces earlier results on a new search", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult();

      await act(async () => view.result.current.searchSpotifyMusic());
      emitSearchResult({ results: [TRACK_TWO], hasMore: false });

      expect(view.result.current.smartSearchResults).toEqual([TRACK_TWO]);
      expect(view.result.current.smartSearchHasMore).toBe(false);
    });

    it("shows the server message when the search fails", async () => {
      const view = renderSmartSearch();
      await search(view);

      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifySmartSearchResult, {
          success: false,
          code: "spotify_api_error",
          message: "Spotify failed.",
        });
      });

      expect(view.result.current.smartSearchPhase).toBe("error");
      expect(view.result.current.smartSearchError).toBe("Spotify failed.");
      expect(view.result.current.smartSearchHasSearched).toBe(false);
      expect(socket.listenerCount(ServerToClientEvent.SpotifySmartSearchResult)).toBe(0);
    });
  });

  describe("loading more", () => {
    it("does nothing before a search reported more results", async () => {
      const view = renderSmartSearch();
      act(() => view.result.current.setSmartSearchQuery("test song"));

      await act(async () => view.result.current.loadMoreSpotifyMusic());

      expect(socket.emitted).toEqual([]);
    });

    it("requests the next page from the reported offset and appends unique results", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult({ nextOffset: 25 });

      await act(async () => view.result.current.loadMoreSpotifyMusic());

      expect(view.result.current.smartSearchLoadMorePhase).toBe("loading");
      expect(socket.emittedFor(ClientToServerEvent.SearchSpotifyMusic).at(-1)).toEqual({
        roomId: TEST_ROOM_ID,
        query: "test song",
        limit: 20,
        offset: 25,
        types: ["track"],
      });

      emitSearchResult({ results: [TRACK_ONE, TRACK_TWO], offset: 25, hasMore: false });

      expect(view.result.current.smartSearchLoadMorePhase).toBe("idle");
      expect(view.result.current.smartSearchResults).toEqual([TRACK_ONE, TRACK_TWO]);
      expect(view.result.current.smartSearchHasMore).toBe(false);
    });

    it("derives the next offset from offset and limit when the server omits it", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult({ nextOffset: undefined, offset: 0, limit: 20 });

      await act(async () => view.result.current.loadMoreSpotifyMusic());

      expect(socket.emittedFor(ClientToServerEvent.SearchSpotifyMusic).at(-1)).toEqual(
        expect.objectContaining({ offset: 20 }),
      );
    });

    it("does not start a second page request while one is loading", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult();

      await act(async () => view.result.current.loadMoreSpotifyMusic());
      await act(async () => view.result.current.loadMoreSpotifyMusic());

      expect(socket.emittedFor(ClientToServerEvent.SearchSpotifyMusic)).toHaveLength(2);
    });

    it("returns the load-more state to idle when the page request fails", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult();
      await act(async () => view.result.current.loadMoreSpotifyMusic());

      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifySmartSearchResult, {
          success: false,
          code: "spotify_api_error",
          message: "Spotify failed.",
        });
      });

      expect(view.result.current.smartSearchLoadMorePhase).toBe("idle");
      expect(view.result.current.smartSearchError).toBe("Spotify failed.");
      expect(view.result.current.smartSearchResults).toEqual([TRACK_ONE]);
    });
  });

  describe("query and type changes", () => {
    it("clears results and closes the opened playlist when the query changes", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult();

      act(() => view.result.current.setSmartSearchQuery("other query"));

      expect(view.result.current.smartSearchQuery).toBe("other query");
      expect(view.result.current.smartSearchResults).toEqual([]);
      expect(view.result.current.smartSearchHasSearched).toBe(false);
      expect(view.result.current.smartSearchHasMore).toBe(false);
      expect(view.params.closeOpenedPlaylist).toHaveBeenCalled();
    });

    it("clears results and closes the opened playlist when the type changes", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult();
      view.params.closeOpenedPlaylist.mockClear();

      act(() => view.result.current.setSmartSearchType("album"));

      expect(view.result.current.smartSearchType).toBe("album");
      expect(view.result.current.smartSearchResults).toEqual([]);
      expect(view.result.current.smartSearchHasSearched).toBe(false);
      expect(view.params.closeOpenedPlaylist).toHaveBeenCalledTimes(1);
    });

    it("resets the search state but keeps the query and type", async () => {
      const view = renderSmartSearch();
      await search(view);
      emitSearchResult();

      act(() => view.result.current.resetSmartSearch());

      expect(view.result.current.smartSearchPhase).toBe("idle");
      expect(view.result.current.smartSearchResults).toEqual([]);
      expect(view.result.current.smartSearchHasSearched).toBe(false);
      expect(view.result.current.smartSearchHasMore).toBe(false);
      expect(view.result.current.smartSearchQuery).toBe("test song");
    });
  });

  describe("adding tracks to the queue", () => {
    it("does nothing without a room", async () => {
      const { result } = renderSmartSearch({ roomId: undefined });

      await act(async () => result.current.addSmartSearchTrackToQueue(TRACK_ONE));

      expect(socket.emitted).toEqual([]);
    });

    it("skips already queued tracks and non-track results", async () => {
      const { result } = renderSmartSearch({ smartSearchQueuedTrackIds: new Set(["TESTTRACK1"]) });

      await act(async () => result.current.addSmartSearchTracksToQueue([TRACK_ONE, ALBUM_RESULT]));

      expect(socket.emitted).toEqual([]);
    });

    it("appends one track and announces a single song on confirmation", async () => {
      const view = renderSmartSearch();

      await act(async () => view.result.current.addSmartSearchTrackToQueue(TRACK_ONE));

      expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([
        {
          roomId: TEST_ROOM_ID,
          mode: "append",
          tracks: [
            {
              id: "TESTTRACK1",
              title: "Test Song",
              artist: "Test Artist",
              albumTitle: "Test Album",
              releaseYear: 1999,
              sourceReleaseYear: 1999,
              metadataStatus: "imported",
              spotifyTrackUri: "spotify:track:TESTTRACK1",
            },
          ],
        },
      ]);

      act(() => {
        socket.serverEmit(ServerToClientEvent.PlaylistTracks, {
          tracks: [queuedTrack("TESTTRACK1")],
        });
      });

      expect(view.params.setQueuedTrackIds).toHaveBeenCalledWith(new Set(["TESTTRACK1"]));
      expect(view.params.setSmartSearchQueuedTrackIds).toHaveBeenCalledWith(
        new Set(["TESTTRACK1"]),
      );
      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(
        "Song added to the queued playlist.",
      );
      expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
    });

    it("announces the count when several tracks are added", async () => {
      const view = renderSmartSearch();

      await act(async () =>
        view.result.current.addSmartSearchTracksToQueue([TRACK_ONE, TRACK_TWO]),
      );
      act(() => {
        socket.serverEmit(ServerToClientEvent.PlaylistTracks, {
          tracks: [queuedTrack("TESTTRACK1"), queuedTrack("TESTTRACK2")],
        });
      });

      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(
        "2 songs added to the queued playlist.",
      );
    });
  });

  describe("removing tracks from the queue", () => {
    it("does nothing without a room", async () => {
      const { result } = renderSmartSearch({ roomId: undefined });

      await act(async () => result.current.removeSmartSearchTracksFromQueue([TRACK_ONE]));

      expect(socket.emitted).toEqual([]);
    });

    it("does nothing when no result is a track", async () => {
      const { result } = renderSmartSearch();

      await act(async () => result.current.removeSmartSearchTracksFromQueue([ALBUM_RESULT]));

      expect(socket.emitted).toEqual([]);
    });

    it("removes both the plain and the legacy queue ids and syncs the queue", async () => {
      const view = renderSmartSearch();

      await act(async () => view.result.current.removeSmartSearchTracksFromQueue([TRACK_ONE]));

      expect(socket.emittedFor(ClientToServerEvent.RemovePlaylistTracks)).toEqual([
        { roomId: TEST_ROOM_ID, trackIds: ["TESTTRACK1", "spotify-search-TESTTRACK1"] },
      ]);

      act(() => {
        socket.serverEmit(ServerToClientEvent.PlaylistTracks, {
          tracks: [queuedTrack("TESTTRACK2")],
        });
      });

      expect(view.params.setQueuedTrackIds).toHaveBeenCalledWith(new Set(["TESTTRACK2"]));
      expect(view.params.setSmartSearchQueuedTrackIds).toHaveBeenCalledWith(
        new Set(["TESTTRACK2"]),
      );
      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(
        "1 songs removed from the queued playlist.",
      );
      expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
    });
  });
});
