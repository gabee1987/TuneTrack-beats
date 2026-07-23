import { describe, expect, it } from "vitest";
import type { PublicRoomState } from "@tunetrack/shared";
import { shouldEnableHostPlayback } from "./HostPlaybackProvider";

function createRoomState(
  overrides: Partial<PublicRoomState> = {},
  settingsOverrides: Partial<PublicRoomState["settings"]> = {},
): PublicRoomState {
  return {
    roomId: "ROOM1",
    status: "turn",
    hostId: "host-1",
    players: [],
    timelines: {},
    currentTrackCard: null,
    targetTimelineCardCount: 10,
    settings: {
      challengeWindowDurationSeconds: 10,
      defaultStartingTimelineCardCount: 1,
      revealConfirmMode: "host_only",
      startingTtTokenCount: 0,
      targetTimelineCardCount: 10,
      ttModeEnabled: true,
      playlistImported: true,
      importedTrackCount: 20,
      spotifyAuthStatus: "connected",
      spotifyAccountType: "premium",
      spotifyPlaybackOwnerPlayerId: "host-1",
      spotifyPlaybackGeneration: 0,
      ...settingsOverrides,
    },
    turn: null,
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
    ...overrides,
  };
}

describe("shouldEnableHostPlayback", () => {
  it("enables playback for the current playback owner with an imported playlist", () => {
    expect(shouldEnableHostPlayback(createRoomState(), "host-1")).toBe(true);
  });

  it("enables playback for the new host after ownership follows a transfer", () => {
    expect(
      shouldEnableHostPlayback(
        createRoomState(
          { hostId: "guest-1" },
          {
            spotifyPlaybackOwnerPlayerId: "guest-1",
            spotifyPlaybackGeneration: 1,
          },
        ),
        "guest-1",
      ),
    ).toBe(true);
  });

  it("disables playback for the previous host after ownership transfers away", () => {
    expect(
      shouldEnableHostPlayback(
        createRoomState(
          { hostId: "guest-1" },
          {
            spotifyPlaybackOwnerPlayerId: "guest-1",
            spotifyPlaybackGeneration: 1,
          },
        ),
        "host-1",
      ),
    ).toBe(false);
  });

  it("disables playback for players who do not own Spotify playback", () => {
    expect(shouldEnableHostPlayback(createRoomState(), "guest-1")).toBe(false);
  });

  it("disables playback when Spotify is not connected", () => {
    expect(
      shouldEnableHostPlayback(
        createRoomState({}, { spotifyAuthStatus: "none", spotifyPlaybackOwnerPlayerId: null }),
        "host-1",
      ),
    ).toBe(false);
  });
});
