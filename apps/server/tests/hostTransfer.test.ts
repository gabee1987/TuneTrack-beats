import { describe, expect, it, vi } from "vitest";
import { RoomRegistry } from "../src/rooms/RoomRegistry.js";
import { fourDecadeDeck } from "./support/decks.js";

describe("host transfer", () => {
  it("waits 30 seconds before transferring an in-game host by default", () => {
    vi.useFakeTimers();

    try {
      const roomRegistry = new RoomRegistry();
      const hostJoin = roomRegistry.createRoom(
        "default-transfer-grace-room",
        "Host Player",
        "host-socket",
        "host-session",
      );
      const guestJoin = roomRegistry.addPlayerToRoom(
        "default-transfer-grace-room",
        "Guest Player",
        "guest-socket",
        "guest-session",
      );
      roomRegistry.startGame(
        "host-socket",
        { roomId: "default-transfer-grace-room" },
        fourDecadeDeck("host-transfer-track"),
      );

      roomRegistry.removePlayerBySocketId("host-socket");
      vi.advanceTimersByTime(29_999);

      expect(
        roomRegistry.getRoomStateForMember("guest-socket", "default-transfer-grace-room").hostId,
      ).toBe(hostJoin.playerId);

      vi.advanceTimersByTime(1);

      expect(
        roomRegistry.getRoomStateForMember("guest-socket", "default-transfer-grace-room").hostId,
      ).toBe(guestJoin.playerId);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not automatically transfer lobby host while they are reconnecting", () => {
    vi.useFakeTimers();
    const roomRegistry = new RoomRegistry(undefined, 1_000, 10);
    const changedRoomStates: string[] = [];
    const hostJoin = roomRegistry.createRoom(
      "lobby-host-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "lobby-host-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    roomRegistry.setRoomStateChangedListener((roomState) => {
      changedRoomStates.push(roomState.hostId);
    });

    const roomAfterDisconnect = roomRegistry.removePlayerBySocketId("host-socket");

    vi.advanceTimersByTime(25);

    const roomAfterGuestReconnect = roomRegistry.addPlayerToRoom(
      "lobby-host-room",
      "Guest Player",
      "refreshed-guest-socket",
      "guest-session",
    );

    expect(roomAfterDisconnect?.hostId).toBe(hostJoin.playerId);
    expect(roomAfterGuestReconnect.roomState.hostId).toBe(hostJoin.playerId);
    expect(roomAfterGuestReconnect.playerId).toBe(guestJoin.playerId);
    expect(changedRoomStates).not.toContain(guestJoin.playerId);
    vi.useRealTimers();
  });

  it("keeps an active-game host player reserved during the transfer grace period", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "active-transfer-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "active-transfer-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomRegistry.startGame(
      "host-socket",
      { roomId: "active-transfer-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    const roomAfterDisconnect = roomRegistry.removePlayerBySocketId("host-socket");

    expect(roomAfterDisconnect?.hostId).toBe(hostJoin.playerId);
    expect(roomAfterDisconnect?.players).toHaveLength(2);
    expect(roomAfterDisconnect?.players.find((player) => player.id === hostJoin.playerId)).toEqual(
      expect.objectContaining({
        connectionStatus: "disconnected",
        isHost: true,
      }),
    );
    expect(roomAfterDisconnect?.players.find((player) => player.id === guestJoin.playerId)).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: false,
      }),
    );
  });

  it("restores a disconnected host as the same host player during the transfer grace period", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "former-host-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomRegistry.addPlayerToRoom(
      "former-host-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomRegistry.startGame(
      "host-socket",
      { roomId: "former-host-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    roomRegistry.removePlayerBySocketId("host-socket");
    const restoredHostJoin = roomRegistry.addPlayerToRoom(
      "former-host-room",
      "Host Player",
      "refreshed-host-socket",
      "host-session",
    );

    expect(restoredHostJoin.playerId).toBe(hostJoin.playerId);
    expect(restoredHostJoin.roomState.hostId).toBe(hostJoin.playerId);
    expect(
      restoredHostJoin.roomState.players.find((player) => player.id === hostJoin.playerId),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: true,
      }),
    );
  });

  it("passes the turn to the next connected player when the active player disconnects", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "active-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomRegistry.addPlayerToRoom(
      "active-turn-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    const startedRoom = roomRegistry.startGame(
      "host-socket",
      { roomId: "active-turn-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    const roomAfterDisconnect = roomRegistry.removePlayerBySocketId("host-socket");

    expect(startedRoom.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(roomAfterDisconnect?.turn).toEqual(
      expect.objectContaining({
        activePlayerId: hostJoin.playerId,
        turnNumber: 1,
        hasUsedSkipTrackWithTt: false,
        turnSkipDeadlineEpochMs: expect.any(Number),
      }),
    );
    expect(roomAfterDisconnect?.currentTrackCard?.id).toBe(startedRoom.currentTrackCard?.id);
    expect(roomAfterDisconnect?.timelines[hostJoin.playerId]).toBeDefined();
  });

  it("does not pass the turn when no connected replacement player exists", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "solo-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomRegistry.startGame(
      "host-socket",
      { roomId: "solo-turn-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    const roomAfterDisconnect = roomRegistry.removePlayerBySocketId("host-socket");

    expect(roomAfterDisconnect?.hostId).toBe(hostJoin.playerId);
    expect(roomAfterDisconnect?.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(roomAfterDisconnect?.players).toEqual([
      expect.objectContaining({
        id: hostJoin.playerId,
        connectionStatus: "disconnected",
        isHost: true,
      }),
    ]);
  });

  it("rejects manual host transfer to a disconnected player", () => {
    const roomRegistry = new RoomRegistry(undefined, 10_000);
    roomRegistry.createRoom(
      "disconnected-target-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "disconnected-target-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomRegistry.removePlayerBySocketId("guest-socket");

    expect(() =>
      roomRegistry.transferHost("host-socket", {
        roomId: "disconnected-target-room",
        playerId: guestJoin.playerId,
      }),
    ).toThrow("HOST_TRANSFER_TARGET_DISCONNECTED");
  });

  it("rejects manual host transfer by a non-host", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "non-host-transfer-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomRegistry.addPlayerToRoom(
      "non-host-transfer-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    expect(() =>
      roomRegistry.transferHost("guest-socket", {
        roomId: "non-host-transfer-room",
        playerId: hostJoin.playerId,
      }),
    ).toThrow("ONLY_HOST_CAN_TRANSFER_HOST");
  });
});
