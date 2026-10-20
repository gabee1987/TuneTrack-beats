import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";
import { useOneOpenList } from "./useOneOpenList";

interface OpenLists {
  deck?: boolean;
  found?: boolean;
  quickPick?: boolean;
}

const closeEditor = vi.fn();
const closeOpenedPlaylist = vi.fn();
const discardGeneratedCandidates = vi.fn();

function buildSpotify({ deck, found, quickPick }: OpenLists): UseLobbySpotifyResult {
  return {
    candidates: {
      candidateTracks: quickPick ? [{ id: "TEST_TRACK_1" }] : [],
      discardGeneratedCandidates,
    },
    openedPlaylist: { closeOpenedPlaylist, openedPlaylistPhase: found ? "ready" : "idle" },
    queue: {
      closeEditor,
      editor: deck ? { deck: "saved", deckId: "TEST_DECK_1", filter: "all" } : null,
    },
  } as unknown as UseLobbySpotifyResult;
}

function renderOpenLists(initial: OpenLists) {
  vi.clearAllMocks();
  return renderHook((lists: OpenLists) => useOneOpenList(buildSpotify(lists)), {
    initialProps: initial,
  });
}

describe("useOneOpenList", () => {
  it("closes the deck when Find opens a list beside it", () => {
    const { rerender } = renderOpenLists({ deck: true });

    rerender({ deck: true, found: true });

    expect(closeEditor).toHaveBeenCalledTimes(1);
    expect(closeOpenedPlaylist).not.toHaveBeenCalled();
  });

  it("closes a found list and a quick pick when a deck opens", () => {
    const { rerender } = renderOpenLists({ found: true, quickPick: true });

    rerender({ deck: true, found: true, quickPick: true });

    expect(closeOpenedPlaylist).toHaveBeenCalledTimes(1);
    expect(discardGeneratedCandidates).toHaveBeenCalledTimes(1);
    expect(closeEditor).not.toHaveBeenCalled();
  });

  it("closes nothing when a list closes or the only one opens", () => {
    const { rerender } = renderOpenLists({});

    rerender({ quickPick: true });
    rerender({});

    expect(closeEditor).not.toHaveBeenCalled();
    expect(closeOpenedPlaylist).not.toHaveBeenCalled();
    expect(discardGeneratedCandidates).not.toHaveBeenCalled();
  });
});
