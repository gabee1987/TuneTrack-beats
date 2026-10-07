import type { PublicTrackInfo } from "@tunetrack/shared/client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import { PlaylistTrackList } from "./PlaylistTrackList";

function buildTrack(index: number): PublicTrackInfo {
  return {
    id: `track-${index}`,
    title: `Test Track ${index}`,
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear: 1980 + index,
    sourceReleaseYear: 1980 + index,
    metadataStatus: "imported",
  } as PublicTrackInfo;
}

function renderList(tracks: PublicTrackInfo[]) {
  const handlers = {
    onOpenTrack: vi.fn(),
    onRemoveTrack: vi.fn(),
    onToggleSelection: vi.fn(),
  };
  const renderList = (nextTracks: PublicTrackInfo[]) => (
    <I18nProvider>
      <PlaylistTrackList {...handlers} selectedIds={new Set(["track-2"])} tracks={nextTracks} />
    </I18nProvider>
  );
  const result = render(renderList(tracks));

  return {
    ...handlers,
    rerenderWith: (nextTracks: PublicTrackInfo[]) => result.rerender(renderList(nextTracks)),
  };
}

describe("PlaylistTrackList", () => {
  it("opens a track and toggles its selection", async () => {
    const user = userEvent.setup();
    const { onOpenTrack, onToggleSelection } = renderList([buildTrack(1), buildTrack(2)]);

    await user.click(screen.getByText("Test Track 1"));
    const selectToggle = screen.getByRole("button", { name: "Select Test Track 2" });
    expect(selectToggle).toHaveAttribute("aria-pressed", "true");
    await user.click(selectToggle);

    expect(onOpenTrack).toHaveBeenCalledWith(expect.objectContaining({ id: "track-1" }));
    expect(onToggleSelection).toHaveBeenCalledWith("track-2");
  });

  it("drops a removed track and keeps the others", () => {
    const { rerenderWith } = renderList([buildTrack(1), buildTrack(2), buildTrack(3)]);

    rerenderWith([buildTrack(1), buildTrack(3)]);

    expect(screen.queryByText("Test Track 2")).not.toBeInTheDocument();
    expect(screen.getByText("Test Track 1")).toBeInTheDocument();
    expect(screen.getByText("Test Track 3")).toBeInTheDocument();
  });
});
