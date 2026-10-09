import { describe, expect, it, vi } from "vitest";
import { createTestRoomCore } from "../support/roomCore.js";
import { fourDecadeDeck } from "../support/decks.js";

describe("in-game disconnect lifecycle", () => {
  it("closes a room after every player stays offline for the one-hour default", () => {
    vi.useFakeTimers();

    try {
      const roomCore = createTestRoomCore({ maxActiveRoomCount: 1 });
      roomCore.lobby.createRoom("abandoned-game", "Host", "host-socket", "host-session");
      roomCore.lobby.addPlayerToRoom("abandoned-game", "Guest", "guest-socket", "guest-session");
      roomCore.gameplay.startGame(
        "host-socket",
        { roomId: "abandoned-game" },
        fourDecadeDeck("lifecycle-track"),
      );

      roomCore.connection.removePlayerBySocketId("host-socket");
      roomCore.connection.removePlayerBySocketId("guest-socket");
      vi.advanceTimersByTime(60 * 60 * 1_000 - 1);

      expect(() =>
        roomCore.lobby.createRoom("replacement-room", "New Host", "new-socket", "new-session"),
      ).toThrow("ROOM_LIMIT_REACHED");

      vi.advanceTimersByTime(1);

      expect(
        roomCore.lobby.createRoom("replacement-room", "New Host", "new-socket", "new-session")
          .roomState.roomId,
      ).toBe("replacement-room");
      expect(() =>
        roomCore.lobby.addPlayerToRoom(
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
      const roomCore = createTestRoomCore({
        maxActiveRoomCount: 1,
        allPlayersOfflineRoomTtlMs: allPlayersOfflineRoomTtlMs,
      });
      roomCore.lobby.createRoom("returning-game", "Host", "host-socket", "host-session");
      const guestJoin = roomCore.lobby.addPlayerToRoom(
        "returning-game",
        "Guest",
        "guest-socket",
        "guest-session",
      );
      roomCore.gameplay.startGame(
        "host-socket",
        { roomId: "returning-game" },
        fourDecadeDeck("lifecycle-track"),
      );

      roomCore.connection.removePlayerBySocketId("host-socket");
      roomCore.connection.removePlayerBySocketId("guest-socket");
      vi.advanceTimersByTime(500);

      const restoredGuest = roomCore.lobby.addPlayerToRoom(
        "returning-game",
        "Guest",
        "restored-guest-socket",
        "guest-session",
      );
      expect(restoredGuest.playerId).toBe(guestJoin.playerId);

      vi.advanceTimersByTime(1_000);
      expect(
        roomCore.store.getRoomStateForMember("restored-guest-socket", "returning-game").roomId,
      ).toBe("returning-game");

      roomCore.connection.removePlayerBySocketId("restored-guest-socket");
      vi.advanceTimersByTime(999);
      expect(() =>
        roomCore.lobby.createRoom("too-early", "New Host", "new-socket", "new-session"),
      ).toThrow("ROOM_LIMIT_REACHED");

      vi.advanceTimersByTime(1);
      expect(
        roomCore.lobby.createRoom("after-reset", "New Host", "new-socket", "new-session").roomState
          .roomId,
      ).toBe("after-reset");
    } finally {
      vi.useRealTimers();
    }
  });
});
