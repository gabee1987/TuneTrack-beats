import type { PublicTrackInfo } from "@tunetrack/shared/client";
import { act, fireEvent, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import { AppToastProvider } from "../../../../features/toast";
import type { SavedPlaylist } from "../../../../services/savedPlaylists/savedPlaylists";
import type { PlaylistEditorSource } from "./playlistEditorTarget";
import { useSavedDeckWriteBack } from "./useSavedDeckWriteBack";

const TRACK: PublicTrackInfo = {
  albumTitle: "Test Album (Remastered)",
  artist: "Test Artist",
  id: "track-1",
  metadataStatus: "imported",
  releaseYear: 2011,
  sourceReleaseYear: 2011,
  title: "Test Track One",
};

const DECK: SavedPlaylist = {
  createdAtEpochMs: 1,
  id: "TEST_DECK_1",
  name: "Test Deck",
  source: "spotify",
  tracks: [TRACK, { ...TRACK, id: "track-2", title: "Test Track Two" }],
  updatedAtEpochMs: 1,
};

function Providers({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, createElement(AppToastProvider, null, children));
}

function buildRoomDeck(tracks: PublicTrackInfo[]): PlaylistEditorSource {
  return { isLoading: false, removeTracks: vi.fn(), tracks, updateTrack: vi.fn() };
}

function renderWriteBack(loadedSavedPlaylistId: string | null, roomDeck = buildRoomDeck([TRACK])) {
  const updateSavedDeckTracks = vi.fn();
  const { result } = renderHook(
    () => useSavedDeckWriteBack({ loadedSavedPlaylistId, updateSavedDeckTracks }, roomDeck),
    { wrapper: Providers },
  );
  return { roomDeck, source: result.current(DECK), updateSavedDeckTracks };
}

describe("useSavedDeckWriteBack", () => {
  it("writes a song edit back at once and Undo restores the deck as it was", () => {
    const { roomDeck, source, updateSavedDeckTracks } = renderWriteBack(null);

    act(() => source.updateTrack("track-1", { releaseYear: 1979 }));

    expect(updateSavedDeckTracks).toHaveBeenLastCalledWith("TEST_DECK_1", [
      expect.objectContaining({ id: "track-1", metadataStatus: "edited", releaseYear: 1979 }),
      DECK.tracks[1],
    ]);
    expect(screen.getByText("Saved to Test Deck")).toBeInTheDocument();
    expect(roomDeck.updateTrack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(updateSavedDeckTracks).toHaveBeenLastCalledWith("TEST_DECK_1", DECK.tracks);
  });

  it("writes a removal back and Undo brings the song back", () => {
    const { source, updateSavedDeckTracks } = renderWriteBack(null);

    act(() => source.removeTracks(["track-2"]));
    expect(updateSavedDeckTracks).toHaveBeenLastCalledWith("TEST_DECK_1", [TRACK]);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(updateSavedDeckTracks).toHaveBeenLastCalledWith("TEST_DECK_1", DECK.tracks);
  });

  it("edits the song in the game's deck too when it was loaded from this saved deck", () => {
    const { roomDeck, source } = renderWriteBack("TEST_DECK_1");

    act(() => source.updateTrack("track-1", { metadataStatus: "verified", releaseYear: 1979 }));
    expect(roomDeck.updateTrack).toHaveBeenLastCalledWith("track-1", {
      metadataStatus: "verified",
      releaseYear: 1979,
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(roomDeck.updateTrack).toHaveBeenLastCalledWith("track-1", {
      albumTitle: "Test Album (Remastered)",
      artist: "Test Artist",
      metadataStatus: "imported",
      releaseYear: 2011,
      title: "Test Track One",
    });
  });

  it("leaves the game's deck alone for a song it no longer holds", () => {
    const { roomDeck, source, updateSavedDeckTracks } = renderWriteBack("TEST_DECK_1");

    act(() => source.updateTrack("track-2", { releaseYear: 1979 }));

    expect(updateSavedDeckTracks).toHaveBeenCalledTimes(1);
    expect(roomDeck.updateTrack).not.toHaveBeenCalled();
  });
});
