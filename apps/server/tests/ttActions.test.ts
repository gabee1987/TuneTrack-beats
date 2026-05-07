import type { GameTrackCard } from "@tunetrack/game-engine";
import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../src/rooms/RoomRegistry.js";

describe("tt actions", () => {
  it("lets the active player skip and buy with TT when TT mode is enabled", () => {
    const roomRegistry = new RoomRegistry();

    const hostJoin = roomRegistry.createRoom(
      "tt-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "tt-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    const tokenSettingsRoomState = roomRegistry.updateRoomSettings("host-socket", "tt-room", {
      roomId: "tt-room",
      targetTimelineCardCount: 10,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 4,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: 10,
    });
    expect(
      tokenSettingsRoomState.players.find((player) => player.id === hostJoin.playerId)
        ?.ttTokenCount,
    ).toBe(4);
    expect(
      tokenSettingsRoomState.players.find((player) => player.id === guestJoin.playerId)
        ?.ttTokenCount,
    ).toBe(4);
    roomRegistry.updatePlayerSettings("host-socket", {
      roomId: "tt-room",
      playerId: guestJoin.playerId,
      startingTimelineCardCount: 1,
      startingTtTokenCount: 2,
    });

    const startedRoomState = roomRegistry.startGame(
      "host-socket",
      { roomId: "tt-room" },
      getTtActionDeck(),
    );

    expect(startedRoomState.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(startedRoomState.currentTrackCard?.id).toBe("tt-track-3");
    expect(
      startedRoomState.players.find((player) => player.id === hostJoin.playerId)
        ?.ttTokenCount,
    ).toBe(4);
    expect(
      startedRoomState.players.find((player) => player.id === guestJoin.playerId)
        ?.ttTokenCount,
    ).toBe(2);

    const roomAfterSkip = roomRegistry.skipTrackWithTt("host-socket", {
      roomId: "tt-room",
    });

    expect(roomAfterSkip.currentTrackCard?.id).toBe("tt-track-4");
    expect(
      roomAfterSkip.players.find((player) => player.id === hostJoin.playerId)
        ?.ttTokenCount,
    ).toBe(3);
    expect(roomAfterSkip.turn?.hasUsedSkipTrackWithTt).toBe(true);

    expect(() =>
      roomRegistry.skipTrackWithTt("host-socket", { roomId: "tt-room" }),
    ).toThrow("SKIP_ALREADY_USED_THIS_TURN");

    const roomAfterBuy = roomRegistry.buyTimelineCardWithTt("host-socket", {
      roomId: "tt-room",
    });

    expect(roomAfterBuy.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(roomAfterBuy.status).toBe("reveal");
    expect(roomAfterBuy.currentTrackCard?.id).toBe("tt-track-4");
    expect(
      roomAfterBuy.players.find((player) => player.id === hostJoin.playerId)
        ?.ttTokenCount,
    ).toBe(0);
    expect(roomAfterBuy.timelines[hostJoin.playerId]).toHaveLength(2);
    expect(roomAfterBuy.revealState).toEqual(
      expect.objectContaining({
        revealType: "tt_buy",
        awardedPlayerId: hostJoin.playerId,
      }),
    );

    expect(() =>
      roomRegistry.skipTrackWithTt("guest-socket", { roomId: "tt-room" }),
    ).toThrow("GAME_NOT_IN_TURN_PHASE");
    expect(() =>
      roomRegistry.buyTimelineCardWithTt("guest-socket", { roomId: "tt-room" }),
    ).toThrow("GAME_NOT_IN_TURN_PHASE");

    expect(guestJoin.playerId).toBeDefined();
  });
});

function getTtActionDeck(): GameTrackCard[] {
  return [
    {
      id: "tt-track-1",
      title: "Track 1",
      artist: "Artist 1",
      albumTitle: "Album 1",
      releaseYear: 1980,
    },
    {
      id: "tt-track-2",
      title: "Track 2",
      artist: "Artist 2",
      albumTitle: "Album 2",
      releaseYear: 1990,
    },
    {
      id: "tt-track-3",
      title: "Track 3",
      artist: "Artist 3",
      albumTitle: "Album 3",
      releaseYear: 2000,
    },
    {
      id: "tt-track-4",
      title: "Track 4",
      artist: "Artist 4",
      albumTitle: "Album 4",
      releaseYear: 2005,
    },
    {
      id: "tt-track-5",
      title: "Track 5",
      artist: "Artist 5",
      albumTitle: "Album 5",
      releaseYear: 2010,
    },
    {
      id: "tt-track-6",
      title: "Track 6",
      artist: "Artist 6",
      albumTitle: "Album 6",
      releaseYear: 2020,
    },
  ];
}

