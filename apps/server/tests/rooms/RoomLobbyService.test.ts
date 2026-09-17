import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";

describe("RoomLobbyService.createRoom", () => {
  it("creates a room with a server-generated code when no custom id is provided", () => {
    const roomRegistry = new RoomRegistry();

    const result = roomRegistry.createRoom(
      undefined,
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    expect(result.roomState.roomId).toMatch(/^[a-z0-9-]{3,12}$/);
  });

  it("restores a generated room when the owning session repeats creation", () => {
    const roomRegistry = new RoomRegistry();
    const firstJoin = roomRegistry.createRoom(
      undefined,
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    const secondJoin = roomRegistry.createRoom(
      undefined,
      "Player One",
      "TEST_SOCKET_2",
      "TEST_SESSION_1",
    );

    expect(secondJoin.playerId).toBe(firstJoin.playerId);
    expect(secondJoin.roomState.roomId).toBe(firstJoin.roomState.roomId);
    expect(roomRegistry.listRoomSummaries()).toHaveLength(1);
  });

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
