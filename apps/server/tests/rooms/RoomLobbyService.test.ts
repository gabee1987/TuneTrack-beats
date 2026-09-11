import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";

describe("RoomLobbyService.createRoom", () => {
  it("restores the same player when the owning session creates the same room twice", () => {
    const roomRegistry = new RoomRegistry();
    const firstJoin = roomRegistry.createRoom(
      "TEST_ROOM_1",
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    const secondJoin = roomRegistry.createRoom(
      "TEST_ROOM_1",
      "Player One",
      "TEST_SOCKET_2",
      "TEST_SESSION_1",
    );

    expect(secondJoin.playerId).toBe(firstJoin.playerId);
    expect(secondJoin.roomState.players).toEqual([
      expect.objectContaining({ id: firstJoin.playerId }),
    ]);
  });

  it("rejects a different session that creates an existing room id", () => {
    const roomRegistry = new RoomRegistry();
    roomRegistry.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");

    expect(() =>
      roomRegistry.createRoom("TEST_ROOM_1", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_ALREADY_EXISTS");
  });
});
