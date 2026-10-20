import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayConfirmation } from "./spotifyPlayConfirmation";

const TRACK_URI = "spotify:track:TEST0000000000000001";
const OTHER_TRACK_URI = "spotify:track:TEST0000000000000002";

function deviceState(uri: string, paused = false): Spotify.PlaybackState {
  return {
    paused,
    position: 0,
    duration: 180_000,
    track_window: { current_track: { uri }, next_tracks: [], previous_tracks: [] },
  } as unknown as Spotify.PlaybackState;
}

describe("createPlayConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("confirms once the device plays the requested track", async () => {
    const confirmation = createPlayConfirmation();
    confirmation.begin("request-1");
    const result = confirmation.waitFor("request-1", TRACK_URI);

    confirmation.confirmIfAudible(deviceState(OTHER_TRACK_URI));
    confirmation.confirmIfAudible(deviceState(TRACK_URI, true));
    confirmation.confirmIfAudible(deviceState(TRACK_URI));

    await expect(result).resolves.toBe(true);
  });

  it("ignores the device while a newer request has taken over", async () => {
    const confirmation = createPlayConfirmation();
    confirmation.begin("request-1");
    const result = confirmation.waitFor("request-1", TRACK_URI);
    confirmation.begin("request-2");

    confirmation.confirmIfAudible(deviceState(TRACK_URI));
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toBe(false);
  });

  it("fails the pending wait when a new one starts", async () => {
    const confirmation = createPlayConfirmation();
    confirmation.begin("request-1");
    const first = confirmation.waitFor("request-1", TRACK_URI);
    confirmation.begin("request-2");
    const second = confirmation.waitFor("request-2", OTHER_TRACK_URI);

    confirmation.confirmIfAudible(deviceState(OTHER_TRACK_URI));

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
  });

  it("fails on demand and after the timeout", async () => {
    const confirmation = createPlayConfirmation();
    confirmation.begin("request-1");
    const failed = confirmation.waitFor("request-1", TRACK_URI);
    confirmation.fail();
    await expect(failed).resolves.toBe(false);

    confirmation.begin("request-2");
    const timedOut = confirmation.waitFor("request-2", TRACK_URI);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(timedOut).resolves.toBe(false);
  });
});
