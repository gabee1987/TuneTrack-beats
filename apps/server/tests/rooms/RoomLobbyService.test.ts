import { describe, expect, it } from "vitest";
import type { RoomCore } from "../../src/rooms/createRoomCore.js";
import { createTestRoomCore } from "../support/roomCore.js";
import { buildYearDeck } from "../support/decks.js";

describe("RoomLobbyService.createRoom", () => {
  it("creates a room with a server-generated code when no custom id is provided", () => {
    const roomCore = createTestRoomCore();

    const result = roomCore.lobby.createRoom(
      undefined,
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    expect(result.roomState.roomId).toMatch(/^[a-z0-9-]{3,12}$/);
  });

  it("restores a generated room when the owning session repeats creation", () => {
    const roomCore = createTestRoomCore();
    const firstJoin = roomCore.lobby.createRoom(
      undefined,
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    const secondJoin = roomCore.lobby.createRoom(
      undefined,
      "Player One",
      "TEST_SOCKET_2",
      "TEST_SESSION_1",
    );

    expect(secondJoin.playerId).toBe(firstJoin.playerId);
    expect(secondJoin.roomState.roomId).toBe(firstJoin.roomState.roomId);
    expect(roomCore.store.listLobbySummaries()).toHaveLength(1);
  });

  it("restores the same player when the owning session creates the same room twice", () => {
    const roomCore = createTestRoomCore();
    const firstJoin = roomCore.lobby.createRoom(
      "TEST_ROOM_1",
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    const secondJoin = roomCore.lobby.createRoom(
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
    const roomCore = createTestRoomCore();
    roomCore.lobby.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");

    expect(() =>
      roomCore.lobby.createRoom("TEST_ROOM_1", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_ALREADY_EXISTS");
  });

  it("uses the configured active room limit", () => {
    const roomCore = createTestRoomCore({ maxActiveRoomCount: 1 });
    roomCore.lobby.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");

    expect(() =>
      roomCore.lobby.createRoom("TEST_ROOM_2", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_LIMIT_REACHED");
  });

  it("lets a host who is alone in their lobby move to a new room at the room limit", () => {
    const roomCore = createTestRoomCore({ maxActiveRoomCount: 1 });
    roomCore.lobby.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");

    const nextJoin = roomCore.lobby.createRoom(
      "TEST_ROOM_2",
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    expect(nextJoin.roomState.roomId).toBe("TEST_ROOM_2");
    expect(roomCore.store.listLobbySummaries()).toHaveLength(1);
  });
});

describe("RoomLobbyService leaving the current lobby", () => {
  function createLobbyWithGuest(roomCore: RoomCore): string {
    roomCore.lobby.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");
    return roomCore.lobby.addPlayerToRoom(
      "TEST_ROOM_1",
      "Player Two",
      "TEST_SOCKET_2",
      "TEST_SESSION_2",
    ).playerId;
  }

  function expectGuestStillInLobby(roomCore: RoomCore, guestId: string): void {
    const roomState = roomCore.store.getRoomStateForMember("TEST_SOCKET_2", "TEST_ROOM_1");
    expect(roomState.players.map((player) => player.id)).toContain(guestId);
  }

  it("keeps the player in their lobby when the room code does not exist", () => {
    const roomCore = createTestRoomCore();
    const guestId = createLobbyWithGuest(roomCore);

    expect(() =>
      roomCore.lobby.addPlayerToRoom(
        "TEST_ROOM_9",
        "Player Two",
        "TEST_SOCKET_2",
        "TEST_SESSION_2",
      ),
    ).toThrow("ROOM_NOT_FOUND");
    expectGuestStillInLobby(roomCore, guestId);
  });

  it("keeps the player in their lobby when the target game has started", () => {
    const roomCore = createTestRoomCore();
    const guestId = createLobbyWithGuest(roomCore);
    roomCore.lobby.createRoom("TEST_ROOM_2", "Player Three", "TEST_SOCKET_3", "TEST_SESSION_3");
    roomCore.gameplay.startGame(
      "TEST_SOCKET_3",
      { roomId: "TEST_ROOM_2" },
      buildYearDeck([1980, 1990, 2000], "lobby-track"),
    );

    expect(() =>
      roomCore.lobby.addPlayerToRoom(
        "TEST_ROOM_2",
        "Player Two",
        "TEST_SOCKET_2",
        "TEST_SESSION_2",
      ),
    ).toThrow("GAME_ALREADY_STARTED");
    expectGuestStillInLobby(roomCore, guestId);
  });

  it("keeps the player in their lobby when the server is at its room limit", () => {
    const roomCore = createTestRoomCore({ maxActiveRoomCount: 1 });
    const guestId = createLobbyWithGuest(roomCore);

    expect(() =>
      roomCore.lobby.createRoom("TEST_ROOM_2", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_LIMIT_REACHED");
    expectGuestStillInLobby(roomCore, guestId);
  });
});
