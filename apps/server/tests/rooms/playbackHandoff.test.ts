import { describe, expect, it } from "vitest";
import type { PublicRoomState } from "@tunetrack/shared";
import {
  buildHostTransferredRoomState,
  buildPlayerRemovedRoomState,
} from "../../src/rooms/roomConnectionBuilders.js";

function createRoomState(
  overrides: Partial<PublicRoomState> = {},
  settingsOverrides: Partial<PublicRoomState["settings"]> = {},
): PublicRoomState {
  return {
    roomId: "ROOM1",
    status: "turn",
    hostId: "host-1",
    players: [
      {
        id: "host-1",
        displayName: "Host",
        isHost: true,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        ttTokenCount: 0,
        startingTimelineCardCount: 1,
      },
      {
        id: "guest-1",
        displayName: "Guest",
        isHost: false,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        ttTokenCount: 0,
        startingTimelineCardCount: 1,
      },
    ],
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
      spotifyPlaybackGeneration: 2,
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

describe("playback handoff with host transfer", () => {
  it("moves playback ownership and bumps generation when Spotify is connected", () => {
    const next = buildHostTransferredRoomState(createRoomState(), "guest-1");

    expect(next.hostId).toBe("guest-1");
    expect(next.settings.spotifyPlaybackOwnerPlayerId).toBe("guest-1");
    expect(next.settings.spotifyPlaybackGeneration).toBe(3);
    expect(next.players.find((player) => player.id === "guest-1")?.isHost).toBe(true);
    expect(next.players.find((player) => player.id === "host-1")?.isHost).toBe(false);
  });

  it("does not bump playback generation when Spotify is not connected", () => {
    const next = buildHostTransferredRoomState(
      createRoomState(
        {},
        {
          spotifyAuthStatus: "none",
          spotifyPlaybackOwnerPlayerId: null,
          spotifyPlaybackGeneration: 0,
        },
      ),
      "guest-1",
    );

    expect(next.hostId).toBe("guest-1");
    expect(next.settings.spotifyPlaybackOwnerPlayerId).toBeNull();
    expect(next.settings.spotifyPlaybackGeneration).toBe(0);
  });

  it("hands off playback when the host is removed from the room", () => {
    const { nextRoomState } = buildPlayerRemovedRoomState(createRoomState(), "host-1");

    expect(nextRoomState?.hostId).toBe("guest-1");
    expect(nextRoomState?.settings.spotifyPlaybackOwnerPlayerId).toBe("guest-1");
    expect(nextRoomState?.settings.spotifyPlaybackGeneration).toBe(3);
  });
});
