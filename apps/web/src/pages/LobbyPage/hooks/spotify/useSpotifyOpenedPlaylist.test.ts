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
import { buildTrackCard, TEST_ROOM_ID } from "../../../../test/roomStateFixtures";
import { useSpotifyOpenedPlaylist } from "./useSpotifyOpenedPlaylist";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const socket = getSharedFakeSocket();

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    ...buildTrackCard({ title: "Test Song" }),
    releaseYear: 1999,
    metadataStatus: "imported",
    ...overrides,
  };
}

const TRACK_ONE = buildTrack({ id: "TESTTRACK1", spotifyTrackUri: "spotify:track:TESTTRACK1" });
const TRACK_TWO = buildTrack({
  id: "TESTTRACK2",
  releaseYear: 2001,
  spotifyTrackUri: "spotify:track:TESTTRACK2",
});

const PLAYLIST_RESULT: SpotifySmartSearchResult = {
  id: "TESTPLAYLIST1",
  type: "playlist",
  title: "Test Playlist",
  subtitle: "Test Owner",
};

const TRACK_RESULT: SpotifySmartSearchResult = {
  id: "TESTTRACK1",
  type: "track",
  title: "Test Song",
  subtitle: "Test Artist",
};

function renderOpenedPlaylist(
  { roomId }: { roomId: string | undefined } = { roomId: TEST_ROOM_ID },
) {
  const params = {
    currentPlaylistNameRef: { current: undefined as string | undefined },
    roomId,
    setQueuedTrackIds: vi.fn(),
    setSavedPlaylistMessage: vi.fn(),
    setSmartSearchQueuedTrackIds: vi.fn(),
  };
  const view = renderHook(() => useSpotifyOpenedPlaylist(params), { wrapper: I18nTestWrapper });
  return { ...view, params };
}

function emitPlaylistDetail(overrides: Record<string, unknown> = {}) {
  act(() => {
    socket.serverEmit(ServerToClientEvent.SpotifyPlaylistDetail, {
      success: true,
      playlistId: "TESTPLAYLIST1",
      sourceType: "playlist",
      title: "Test Playlist",
      subtitle: "Test Owner",
      totalFetched: 3,
      filteredCount: 1,
      tracks: [TRACK_ONE, TRACK_TWO],
      ...overrides,
    });
  });
}

async function openReadyPlaylist(view: ReturnType<typeof renderOpenedPlaylist>) {
  await act(async () => view.result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));
  emitPlaylistDetail();
}

beforeEach(() => {
  resetSharedFakeSocket();
});

describe("useSpotifyOpenedPlaylist", () => {
  it("starts idle with no playlist", () => {
    const { result } = renderOpenedPlaylist();

    expect(result.current.openedPlaylistPhase).toBe("idle");
    expect(result.current.openedPlaylistError).toBeNull();
    expect(result.current.openedPlaylist).toBeNull();
  });

  describe("openSmartSearchPlaylist", () => {
    it("does not open a track result", async () => {
      const { result } = renderOpenedPlaylist();

      await act(async () => result.current.openSmartSearchPlaylist(TRACK_RESULT));

      expect(result.current.openedPlaylistPhase).toBe("idle");
      expect(socket.emitted).toEqual([]);
    });

    it("does nothing without a room", async () => {
      const { result } = renderOpenedPlaylist({ roomId: undefined });

      await act(async () => result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));

      expect(result.current.openedPlaylistPhase).toBe("idle");
      expect(socket.emitted).toEqual([]);
    });

    it("requests the playlist detail with its source type", async () => {
      const { result } = renderOpenedPlaylist();

      await act(async () =>
        result.current.openSmartSearchPlaylist({ ...PLAYLIST_RESULT, type: "album" }),
      );

      expect(result.current.openedPlaylistPhase).toBe("loading");
      expect(socket.emittedFor(ClientToServerEvent.OpenSpotifyPlaylist)).toEqual([
        { roomId: TEST_ROOM_ID, playlistId: "TESTPLAYLIST1", sourceType: "album" },
      ]);
      expect(socket.listenerCount(ServerToClientEvent.SpotifyPlaylistDetail)).toBe(1);
    });

    it("stores the opened playlist and stops listening on success", async () => {
      const view = renderOpenedPlaylist();

      await openReadyPlaylist(view);

      expect(view.result.current.openedPlaylistPhase).toBe("ready");
      expect(view.result.current.openedPlaylist).toEqual({
        id: "TESTPLAYLIST1",
        title: "Test Playlist",
        subtitle: "Test Owner",
        totalFetched: 3,
        filteredCount: 1,
        tracks: [TRACK_ONE, TRACK_TWO],
      });
      expect(socket.listenerCount(ServerToClientEvent.SpotifyPlaylistDetail)).toBe(0);
    });

    it("keeps the artwork when the detail carries one", async () => {
      const { result } = renderOpenedPlaylist();
      await act(async () => result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));

      emitPlaylistDetail({ imageUrl: "https://example.test/cover.png" });

      expect(result.current.openedPlaylist?.imageUrl).toBe("https://example.test/cover.png");
    });

    it("shows the server message when the detail fails", async () => {
      const { result } = renderOpenedPlaylist();
      await act(async () => result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));

      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifyPlaylistDetail, {
          success: false,
          code: "invalid_playlist",
          message: "Playlist not found.",
        });
      });

      expect(result.current.openedPlaylistPhase).toBe("error");
      expect(result.current.openedPlaylistError).toBe("Playlist not found.");
      expect(result.current.openedPlaylist).toBeNull();
      expect(socket.listenerCount(ServerToClientEvent.SpotifyPlaylistDetail)).toBe(0);
    });

    it("clears a previous error when a new playlist is opened", async () => {
      const { result } = renderOpenedPlaylist();
      await act(async () => result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));
      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifyPlaylistDetail, {
          success: false,
          code: "spotify_api_error",
          message: "Spotify failed.",
        });
      });

      await act(async () => result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));

      expect(result.current.openedPlaylistPhase).toBe("loading");
      expect(result.current.openedPlaylistError).toBeNull();
    });
  });

  it("closes the opened playlist", async () => {
    const view = renderOpenedPlaylist();
    await openReadyPlaylist(view);

    act(() => view.result.current.closeOpenedPlaylist());

    expect(view.result.current.openedPlaylistPhase).toBe("idle");
    expect(view.result.current.openedPlaylist).toBeNull();
  });

  it("resets the opened playlist", async () => {
    const view = renderOpenedPlaylist();
    await openReadyPlaylist(view);

    act(() => view.result.current.resetOpenedPlaylist());

    expect(view.result.current.openedPlaylistPhase).toBe("idle");
    expect(view.result.current.openedPlaylistError).toBeNull();
    expect(view.result.current.openedPlaylist).toBeNull();
  });

  describe("local track edits", () => {
    it("ignores removals and edits while no playlist is open", () => {
      const { result } = renderOpenedPlaylist();

      act(() => {
        result.current.removeOpenedPlaylistTrack("TESTTRACK1");
        result.current.updateOpenedPlaylistTrack("TESTTRACK1", { releaseYear: 1975 });
      });

      expect(result.current.openedPlaylist).toBeNull();
    });

    it("removes one track from the opened playlist", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);

      act(() => view.result.current.removeOpenedPlaylistTrack("TESTTRACK1"));

      expect(view.result.current.openedPlaylist?.tracks).toEqual([TRACK_TWO]);
    });

    it("edits one track and records the imported year as the source year", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);

      act(() => view.result.current.updateOpenedPlaylistTrack("TESTTRACK1", { releaseYear: 1975 }));

      const [edited, untouched] = view.result.current.openedPlaylist?.tracks ?? [];
      expect(edited).toMatchObject({
        releaseYear: 1975,
        sourceReleaseYear: 1999,
        metadataStatus: "imported",
      });
      expect(untouched).toEqual(TRACK_TWO);
    });

    it("keeps an existing source year and applies an explicit metadata status", async () => {
      const { result } = renderOpenedPlaylist();
      await act(async () => result.current.openSmartSearchPlaylist(PLAYLIST_RESULT));
      emitPlaylistDetail({ tracks: [{ ...TRACK_ONE, sourceReleaseYear: 2010 }] });

      act(() =>
        result.current.updateOpenedPlaylistTrack("TESTTRACK1", {
          releaseYear: 1975,
          metadataStatus: "verified",
        }),
      );

      expect(result.current.openedPlaylist?.tracks[0]).toMatchObject({
        releaseYear: 1975,
        sourceReleaseYear: 2010,
        metadataStatus: "verified",
      });
    });
  });

  describe("applyOpenedPlaylistTracks", () => {
    it("does nothing while no playlist is open", async () => {
      const { result } = renderOpenedPlaylist();

      await act(async () => result.current.applyOpenedPlaylistTracks("replace"));

      expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([]);
    });

    it("does nothing when the chosen ids match no track", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);

      await act(async () =>
        view.result.current.applyOpenedPlaylistTracks("append", new Set(["TESTTRACK9"])),
      );

      expect(view.result.current.openedPlaylistPhase).toBe("ready");
      expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([]);
    });

    it("loads every track when no ids are chosen", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);

      await act(async () => view.result.current.applyOpenedPlaylistTracks("replace", new Set()));

      expect(view.result.current.openedPlaylistPhase).toBe("applying");
      expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([
        { roomId: TEST_ROOM_ID, mode: "replace", tracks: [TRACK_ONE, TRACK_TWO] },
      ]);
      expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(1);
    });

    it("loads only the chosen tracks", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);

      await act(async () =>
        view.result.current.applyOpenedPlaylistTracks("append", new Set(["TESTTRACK2"])),
      );

      expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([
        { roomId: TEST_ROOM_ID, mode: "append", tracks: [TRACK_TWO] },
      ]);
    });

    it("syncs the queue, names the playlist and announces a replace on confirmation", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);
      await act(async () => view.result.current.applyOpenedPlaylistTracks("replace"));

      act(() => {
        socket.serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [TRACK_ONE, TRACK_TWO] });
      });

      expect(view.result.current.openedPlaylistPhase).toBe("ready");
      expect(view.params.setQueuedTrackIds).toHaveBeenCalledWith(
        new Set(["TESTTRACK1", "TESTTRACK2"]),
      );
      expect(view.params.setSmartSearchQueuedTrackIds).toHaveBeenCalledWith(
        new Set(["TESTTRACK1", "TESTTRACK2"]),
      );
      expect(view.params.currentPlaylistNameRef.current).toBe("Test Playlist");
      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(
        "Queue replaced with 2 songs.",
      );
      expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
    });

    it("announces an append with the number of sent tracks", async () => {
      const view = renderOpenedPlaylist();
      await openReadyPlaylist(view);
      await act(async () =>
        view.result.current.applyOpenedPlaylistTracks("append", new Set(["TESTTRACK1"])),
      );

      act(() => {
        socket.serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [TRACK_ONE] });
      });

      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(
        "1 songs added to the queued playlist.",
      );
    });
  });

  describe("removeOpenedPlaylistTracksFromQueue", () => {
    it("does nothing for an empty selection", async () => {
      const { result } = renderOpenedPlaylist();

      await act(async () => result.current.removeOpenedPlaylistTracksFromQueue(new Set()));

      expect(socket.emitted).toEqual([]);
    });

    it("does nothing without a room", async () => {
      const { result } = renderOpenedPlaylist({ roomId: undefined });

      await act(async () =>
        result.current.removeOpenedPlaylistTracksFromQueue(new Set(["TESTTRACK1"])),
      );

      expect(socket.emitted).toEqual([]);
    });

    it("removes the tracks and syncs the queue on confirmation", async () => {
      const view = renderOpenedPlaylist();

      await act(async () =>
        view.result.current.removeOpenedPlaylistTracksFromQueue(
          new Set(["TESTTRACK1", "TESTTRACK2"]),
        ),
      );

      expect(socket.emittedFor(ClientToServerEvent.RemovePlaylistTracks)).toEqual([
        { roomId: TEST_ROOM_ID, trackIds: ["TESTTRACK1", "TESTTRACK2"] },
      ]);

      act(() => {
        socket.serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [TRACK_TWO] });
      });

      expect(view.params.setQueuedTrackIds).toHaveBeenCalledWith(new Set(["TESTTRACK2"]));
      expect(view.params.setSmartSearchQueuedTrackIds).toHaveBeenCalledWith(
        new Set(["TESTTRACK2"]),
      );
      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(
        "2 songs removed from the queued playlist.",
      );
      expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
    });
  });
});
