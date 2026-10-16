import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import { AppToastProvider } from "../../../../features/toast";
import type { ImportPhase, UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";
import { useMusicFind } from "./useMusicFind";

function buildSpotify(importPhase: ImportPhase) {
  return {
    import: { importError: null, importPhase, importPlaylist: vi.fn(), setPlaylistUrl: vi.fn() },
    playlistSearch: {
      playlistSearchError: null,
      playlistSearchPhase: "idle",
      playlistSearchResults: [],
      searchSpotifyPlaylists: vi.fn(),
      setPlaylistSearchQuery: vi.fn(),
    },
    smartSearch: {
      searchSpotifyMusic: vi.fn(),
      searchSpotifyMusicByType: vi.fn(),
      setSmartSearchQuery: vi.fn(),
      setSmartSearchType: vi.fn(),
      smartSearchError: null,
      smartSearchHasMore: false,
      smartSearchHasSearched: false,
      smartSearchLoadMorePhase: "idle",
      smartSearchPhase: "idle",
      smartSearchQueuedTrackIds: new Set<string>(),
      smartSearchResults: [],
    },
  } as unknown as UseLobbySpotifyResult;
}

function Providers({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, createElement(AppToastProvider, null, children));
}

function renderFind(importPhase: ImportPhase = "idle") {
  return renderHook(({ spotify }) => useMusicFind(spotify), {
    initialProps: { spotify: buildSpotify(importPhase) },
    wrapper: Providers,
  });
}

describe("useMusicFind", () => {
  it("hands the typed text to the link import and both searches", () => {
    const spotify = buildSpotify("idle");
    const { result } = renderHook(() => useMusicFind(spotify), { wrapper: Providers });

    act(() => result.current.changeQuery("eighties"));

    expect(result.current.query).toBe("eighties");
    expect(spotify.import.setPlaylistUrl).toHaveBeenCalledWith("eighties");
    expect(spotify.smartSearch.setSmartSearchQuery).toHaveBeenCalledWith("eighties");
    expect(spotify.playlistSearch.setPlaylistSearchQuery).toHaveBeenCalledWith("eighties");
  });

  it("does not search one letter, and searches the chosen type once the query is long enough", () => {
    const spotify = buildSpotify("idle");
    const { result } = renderHook(() => useMusicFind(spotify), { wrapper: Providers });

    act(() => result.current.changeQuery("a"));
    act(() => result.current.submit());
    expect(spotify.smartSearch.searchSpotifyMusic).not.toHaveBeenCalled();

    act(() => result.current.changeQuery("abba"));
    act(() => result.current.changeKind("artist"));
    expect(spotify.smartSearch.searchSpotifyMusicByType).toHaveBeenCalledWith("artist");
  });

  it("clears the field once a pasted link has imported, and keeps it after a failure", () => {
    const { rerender, result } = renderFind("idle");

    act(() => result.current.changeQuery("spotify:playlist:TESTPLAYLIST1234567890"));
    rerender({ spotify: buildSpotify("importing") });
    rerender({ spotify: buildSpotify("error") });
    expect(result.current.query).toBe("spotify:playlist:TESTPLAYLIST1234567890");

    rerender({ spotify: buildSpotify("importing") });
    rerender({ spotify: buildSpotify("idle") });
    expect(result.current.query).toBe("");
  });
});
