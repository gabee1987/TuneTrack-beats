import { describe, expect, it, vi } from "vitest";
import { createTestRoomCore } from "./support/roomCore.js";
import { fourDecadeDeck } from "./support/decks.js";

describe("host transfer", () => {
  it("waits 30 seconds before transferring an in-game host by default", () => {
    vi.useFakeTimers();

    try {
      const roomCore = createTestRoomCore();
      const hostJoin = roomCore.lobby.createRoom(
        "default-transfer-grace-room",
        "Host Player",
        "host-socket",
        "host-session",
      );
      const guestJoin = roomCore.lobby.addPlayerToRoom(
        "default-transfer-grace-room",
        "Guest Player",
        "guest-socket",
        "guest-session",
      );
      roomCore.gameplay.startGame(
        "host-socket",
        { roomId: "default-transfer-grace-room" },
        fourDecadeDeck("host-transfer-track"),
      );

      roomCore.connection.removePlayerBySocketId("host-socket");
      vi.advanceTimersByTime(29_999);

      expect(
        roomCore.store.getRoomStateForMember("guest-socket", "default-transfer-grace-room").hostId,
      ).toBe(hostJoin.playerId);

      vi.advanceTimersByTime(1);

      expect(
        roomCore.store.getRoomStateForMember("guest-socket", "default-transfer-grace-room").hostId,
      ).toBe(guestJoin.playerId);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not automatically transfer lobby host while they are reconnecting", () => {
    vi.useFakeTimers();
    const roomCore = createTestRoomCore({
      reconnectGracePeriodMs: 1_000,
      hostTransferGracePeriodMs: 10,
    });
    const changedRoomStates: string[] = [];
    const hostJoin = roomCore.lobby.createRoom(
      "lobby-host-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "lobby-host-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    roomCore.events.on("roomStateChanged", (roomState) => {
      changedRoomStates.push(roomState.hostId);
    });

    const roomAfterDisconnect = roomCore.connection.removePlayerBySocketId("host-socket");

    vi.advanceTimersByTime(25);

    const roomAfterGuestReconnect = roomCore.lobby.addPlayerToRoom(
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
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "active-transfer-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "active-transfer-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.gameplay.startGame(
      "host-socket",
      { roomId: "active-transfer-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    const roomAfterDisconnect = roomCore.connection.removePlayerBySocketId("host-socket");

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
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "former-host-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomCore.lobby.addPlayerToRoom(
      "former-host-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.gameplay.startGame(
      "host-socket",
      { roomId: "former-host-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    roomCore.connection.removePlayerBySocketId("host-socket");
    const restoredHostJoin = roomCore.lobby.addPlayerToRoom(
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
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "active-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomCore.lobby.addPlayerToRoom(
      "active-turn-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    const startedRoom = roomCore.gameplay.startGame(
      "host-socket",
      { roomId: "active-turn-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    const roomAfterDisconnect = roomCore.connection.removePlayerBySocketId("host-socket");

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
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "solo-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomCore.gameplay.startGame(
      "host-socket",
      { roomId: "solo-turn-room" },
      fourDecadeDeck("host-transfer-track"),
    );

    const roomAfterDisconnect = roomCore.connection.removePlayerBySocketId("host-socket");

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
    const roomCore = createTestRoomCore({ reconnectGracePeriodMs: 10_000 });
    roomCore.lobby.createRoom(
      "disconnected-target-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "disconnected-target-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.connection.removePlayerBySocketId("guest-socket");

    expect(() =>
      roomCore.connection.transferHost("host-socket", {
        roomId: "disconnected-target-room",
        playerId: guestJoin.playerId,
      }),
    ).toThrow("HOST_TRANSFER_TARGET_DISCONNECTED");
  });

  it("rejects manual host transfer by a non-host", () => {
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "non-host-transfer-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomCore.lobby.addPlayerToRoom(
      "non-host-transfer-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    expect(() =>
      roomCore.connection.transferHost("guest-socket", {
        roomId: "non-host-transfer-room",
        playerId: hostJoin.playerId,
      }),
    ).toThrow("ONLY_HOST_CAN_TRANSFER_HOST");
  });
});
