import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import type { HostPlaybackControls } from "../hooks/HostPlaybackProvider";
import { HostPlaybackChip, PRACTICE_NOTICE_DURATION_MS } from "./HostPlaybackChip";

const controls: HostPlaybackControls = {
  isReady: false,
  needsUserGesture: false,
  pause: vi.fn(),
  restart: vi.fn(),
  resume: vi.fn(),
  seek: vi.fn(),
  unlockPlayback: vi.fn(),
};

vi.mock("../hooks/HostPlaybackProvider", () => ({
  useHostPlaybackControls: () => controls,
}));

describe("HostPlaybackChip", () => {
  beforeEach(() => {
    controls.isReady = false;
    controls.needsUserGesture = false;
    vi.mocked(controls.restart).mockClear();
    vi.mocked(controls.unlockPlayback).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says Spotify is connecting until the player is ready, then gets out of the way", () => {
    const { rerender } = renderWithProviders(<HostPlaybackChip notice="owner" />);

    expect(screen.getByRole("status")).toHaveTextContent("Connecting to Spotify…");

    controls.isReady = true;
    rerender(<HostPlaybackChip notice="owner" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a tap when the browser blocked the song, and a keyboard press starts it", () => {
    controls.isReady = true;
    controls.needsUserGesture = true;
    renderWithProviders(<HostPlaybackChip notice="owner" />);

    fireEvent.click(screen.getByRole("button", { name: "Tap to start the song" }), { detail: 0 });

    expect(controls.unlockPlayback).toHaveBeenCalledTimes(1);
    expect(controls.restart).toHaveBeenCalledTimes(1);
  });

  it("leaves a pointer tap to the provider's listener, so the song is not started twice", () => {
    controls.isReady = true;
    controls.needsUserGesture = true;
    renderWithProviders(<HostPlaybackChip notice="owner" />);

    fireEvent.click(screen.getByRole("button", { name: "Tap to start the song" }), { detail: 1 });

    expect(controls.restart).not.toHaveBeenCalled();
  });

  it("notes the practice deck once and hides it", () => {
    vi.useFakeTimers();
    renderWithProviders(<HostPlaybackChip notice="practice" />);

    expect(screen.getByText("Practice deck · no audio")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PRACTICE_NOTICE_DURATION_MS);
    });

    expect(screen.queryByText("Practice deck · no audio")).not.toBeInTheDocument();
  });

  it("shows nothing for a player who does not own playback", () => {
    renderWithProviders(<HostPlaybackChip notice={null} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Practice deck · no audio")).not.toBeInTheDocument();
  });
});
