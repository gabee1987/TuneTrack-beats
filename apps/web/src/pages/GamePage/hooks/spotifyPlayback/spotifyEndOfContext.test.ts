import { describe, expect, it } from "vitest";
import { isEndOfContext } from "./spotifyEndOfContext";

const DURATION_MS = 180_000;

function playbackState({
  paused = true,
  position = 0,
  duration = DURATION_MS,
  hasNextTracks = false,
}: {
  paused?: boolean;
  position?: number;
  duration?: number;
  hasNextTracks?: boolean;
}): Spotify.PlaybackState {
  return {
    paused,
    position,
    duration,
    track_window: {
      current_track: { uri: "spotify:track:TEST0000000000000001" },
      next_tracks: hasNextTracks ? [{ uri: "spotify:track:TEST_NEXT" }] : [],
      previous_tracks: [],
    },
  } as unknown as Spotify.PlaybackState;
}

describe("isEndOfContext", () => {
  it("treats a pause back at the start as an exhausted context", () => {
    expect(isEndOfContext(playbackState({ position: 0 }))).toBe(true);
    expect(isEndOfContext(playbackState({ position: 1_000 }))).toBe(true);
  });

  it("treats a pause at the end as an exhausted context", () => {
    expect(isEndOfContext(playbackState({ position: DURATION_MS }))).toBe(true);
    expect(isEndOfContext(playbackState({ position: DURATION_MS - 1_000 }))).toBe(true);
  });

  it("keeps a pause part-way through resumable", () => {
    expect(isEndOfContext(playbackState({ position: 1_001 }))).toBe(false);
    expect(isEndOfContext(playbackState({ position: DURATION_MS - 1_001 }))).toBe(false);
  });

  it("never ends a context that is playing or still has tracks queued", () => {
    expect(isEndOfContext(playbackState({ paused: false, position: 0 }))).toBe(false);
    expect(isEndOfContext(playbackState({ position: 0, hasNextTracks: true }))).toBe(false);
  });

  it("does not read an unknown duration as the end of the track", () => {
    expect(isEndOfContext(playbackState({ position: 60_000, duration: 0 }))).toBe(false);
  });
});
