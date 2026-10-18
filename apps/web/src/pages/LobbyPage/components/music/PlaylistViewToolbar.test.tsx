import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggerIntersection } from "../../../../test/stubs/observers";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import type { UsePlaylistEditorResult } from "../../hooks/usePlaylistEditor";
import { PlaylistViewToolbar } from "./PlaylistViewToolbar";

function renderToolbar(needsCheckCount: number) {
  const editor = {
    allTracks: [],
    filter: "all",
    needsCheckCount,
    setFilter: vi.fn(),
    setSort: vi.fn(),
    sort: "original",
  } as unknown as UsePlaylistEditorResult;
  renderWithProviders(<PlaylistViewToolbar editor={editor} />);
  act(() => triggerIntersection(true));
  act(() => {
    vi.advanceTimersByTime(1_500);
  });
}

describe("PlaylistViewToolbar first-run hint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("points at Needs check once songs need a check, until the chip is used", () => {
    renderToolbar(2);

    expect(screen.getByRole("status", { name: "Some years look off" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Needs check (2)" }));
    expect(screen.queryByRole("status", { name: "Some years look off" })).not.toBeInTheDocument();
  });

  it("stays quiet while every year looks right", () => {
    renderToolbar(0);

    expect(screen.queryByRole("status", { name: "Some years look off" })).not.toBeInTheDocument();
  });
});
