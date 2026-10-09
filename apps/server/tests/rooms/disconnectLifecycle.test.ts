import { describe, expect, it, vi } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { fourDecadeDeck } from "../support/decks.js";

describe("in-game disconnect lifecycle", () => {
  it("closes a room after every player stays offline for the one-hour default", () => {
    vi.useFakeTimers();

    try {
      const roomRegistry = new RoomRegistry(undefined, undefined, undefined, undefined, 1);
      roomRegistry.createRoom("abandoned-game", "Host", "host-socket", "host-session");
      roomRegistry.addPlayerToRoom("abandoned-game", "Guest", "guest-socket", "guest-session");
      roomRegistry.startGame(
        "host-socket",
        { roomId: "abandoned-game" },
        fourDecadeDeck("lifecycle-track"),
      );

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
      roomRegistry.startGame(
        "host-socket",
        { roomId: "returning-game" },
        fourDecadeDeck("lifecycle-track"),
      );

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
