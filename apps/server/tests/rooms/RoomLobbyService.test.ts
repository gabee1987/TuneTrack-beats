import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { buildYearDeck } from "../support/decks.js";

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

  it("uses the configured active room limit", () => {
    const roomRegistry = new RoomRegistry(undefined, undefined, undefined, undefined, 1);
    roomRegistry.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");

    expect(() =>
      roomRegistry.createRoom("TEST_ROOM_2", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_LIMIT_REACHED");
  });

  it("lets a host who is alone in their lobby move to a new room at the room limit", () => {
    const roomRegistry = new RoomRegistry(undefined, undefined, undefined, undefined, 1);
    roomRegistry.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");

    const nextJoin = roomRegistry.createRoom(
      "TEST_ROOM_2",
      "Player One",
      "TEST_SOCKET_1",
      "TEST_SESSION_1",
    );

    expect(nextJoin.roomState.roomId).toBe("TEST_ROOM_2");
    expect(roomRegistry.listRoomSummaries()).toHaveLength(1);
  });
});

describe("RoomLobbyService leaving the current lobby", () => {
  function createLobbyWithGuest(roomRegistry: RoomRegistry): string {
    roomRegistry.createRoom("TEST_ROOM_1", "Player One", "TEST_SOCKET_1", "TEST_SESSION_1");
    return roomRegistry.addPlayerToRoom(
      "TEST_ROOM_1",
      "Player Two",
      "TEST_SOCKET_2",
      "TEST_SESSION_2",
    ).playerId;
  }

  function expectGuestStillInLobby(roomRegistry: RoomRegistry, guestId: string): void {
    const roomState = roomRegistry.getRoomStateForMember("TEST_SOCKET_2", "TEST_ROOM_1");
    expect(roomState.players.map((player) => player.id)).toContain(guestId);
  }

  it("keeps the player in their lobby when the room code does not exist", () => {
    const roomRegistry = new RoomRegistry();
    const guestId = createLobbyWithGuest(roomRegistry);

    expect(() =>
      roomRegistry.addPlayerToRoom("TEST_ROOM_9", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_NOT_FOUND");
    expectGuestStillInLobby(roomRegistry, guestId);
  });

  it("keeps the player in their lobby when the target game has started", () => {
    const roomRegistry = new RoomRegistry();
    const guestId = createLobbyWithGuest(roomRegistry);
    roomRegistry.createRoom("TEST_ROOM_2", "Player Three", "TEST_SOCKET_3", "TEST_SESSION_3");
    roomRegistry.startGame(
      "TEST_SOCKET_3",
      { roomId: "TEST_ROOM_2" },
      buildYearDeck([1980, 1990, 2000], "lobby-track"),
    );

    expect(() =>
      roomRegistry.addPlayerToRoom("TEST_ROOM_2", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("GAME_ALREADY_STARTED");
    expectGuestStillInLobby(roomRegistry, guestId);
  });

  it("keeps the player in their lobby when the server is at its room limit", () => {
    const roomRegistry = new RoomRegistry(undefined, undefined, undefined, undefined, 1);
    const guestId = createLobbyWithGuest(roomRegistry);

    expect(() =>
      roomRegistry.createRoom("TEST_ROOM_2", "Player Two", "TEST_SOCKET_2", "TEST_SESSION_2"),
    ).toThrow("ROOM_LIMIT_REACHED");
    expectGuestStillInLobby(roomRegistry, guestId);
  });
});
