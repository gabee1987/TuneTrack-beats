import type { GameTrackCard } from "@tunetrack/game-engine";
import { describe, expect, it, vi } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";

describe("in-game disconnect lifecycle", () => {
  it("closes a room after every player stays offline for the one-hour default", () => {
    vi.useFakeTimers();

    try {
      const roomRegistry = new RoomRegistry(undefined, undefined, undefined, undefined, 1);
      roomRegistry.createRoom("abandoned-game", "Host", "host-socket", "host-session");
      roomRegistry.addPlayerToRoom("abandoned-game", "Guest", "guest-socket", "guest-session");
      roomRegistry.startGame("host-socket", { roomId: "abandoned-game" }, getLifecycleDeck());

      roomRegistry.removePlayerBySocketId("host-socket");
      roomRegistry.removePlayerBySocketId("guest-socket");
      vi.advanceTimersByTime(60 * 60 * 1_000 - 1);

      expect(() =>
        roomRegistry.createRoom("replacement-room", "New Host", "new-socket", "new-session"),
      ).toThrow("ROOM_LIMIT_REACHED");

      vi.advanceTimersByTime(1);

      expect(
        roomRegistry.createRoom("replacement-room", "New Host", "new-socket", "new-session")
          .roomState.roomId,
      ).toBe("replacement-room");
      expect(() =>
        roomRegistry.addPlayerToRoom(
          "abandoned-game",
          "Guest",
          "restored-guest-socket",
          "guest-session",
        ),
      ).toThrow("ROOM_NOT_FOUND");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels cleanup when anyone reconnects and restarts it after everyone leaves again", () => {
    vi.useFakeTimers();

    try {
      const allPlayersOfflineRoomTtlMs = 1_000;
      const roomRegistry = new RoomRegistry(
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        allPlayersOfflineRoomTtlMs,
      );
      roomRegistry.createRoom("returning-game", "Host", "host-socket", "host-session");
      const guestJoin = roomRegistry.addPlayerToRoom(
        "returning-game",
        "Guest",
        "guest-socket",
        "guest-session",
      );
      roomRegistry.startGame("host-socket", { roomId: "returning-game" }, getLifecycleDeck());

      roomRegistry.removePlayerBySocketId("host-socket");
      roomRegistry.removePlayerBySocketId("guest-socket");
      vi.advanceTimersByTime(500);

      const restoredGuest = roomRegistry.addPlayerToRoom(
        "returning-game",
        "Guest",
        "restored-guest-socket",
        "guest-session",
      );
      expect(restoredGuest.playerId).toBe(guestJoin.playerId);

      vi.advanceTimersByTime(1_000);
      expect(
        roomRegistry.getRoomStateForMember("restored-guest-socket", "returning-game").roomId,
      ).toBe("returning-game");

      roomRegistry.removePlayerBySocketId("restored-guest-socket");
      vi.advanceTimersByTime(999);
      expect(() =>
        roomRegistry.createRoom("too-early", "New Host", "new-socket", "new-session"),
      ).toThrow("ROOM_LIMIT_REACHED");

      vi.advanceTimersByTime(1);
      expect(
        roomRegistry.createRoom("after-reset", "New Host", "new-socket", "new-session").roomState
          .roomId,
      ).toBe("after-reset");
    } finally {
      vi.useRealTimers();
    }
  });
});

function getLifecycleDeck(): GameTrackCard[] {
  return [
    {
      id: "lifecycle-track-1",
      title: "Track 1",
      artist: "Artist 1",
      albumTitle: "Album 1",
      releaseYear: 1980,
    },
    {
      id: "lifecycle-track-2",
      title: "Track 2",
      artist: "Artist 2",
      albumTitle: "Album 2",
      releaseYear: 1990,
    },
    {
      id: "lifecycle-track-3",
      title: "Track 3",
      artist: "Artist 3",
      albumTitle: "Album 3",
      releaseYear: 2000,
    },
    {
      id: "lifecycle-track-4",
      title: "Track 4",
      artist: "Artist 4",
      albumTitle: "Album 4",
      releaseYear: 2010,
    },
  ];
}
