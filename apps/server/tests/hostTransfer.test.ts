import type { GameTrackCard } from "@tunetrack/game-engine";
import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../src/rooms/RoomRegistry.js";

describe("host transfer", () => {
  it("keeps an active-game host player reserved during the transfer grace period", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.addPlayerToRoom(
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
      getHostTransferDeck(),
    );

    const roomAfterDisconnect =
      roomRegistry.removePlayerBySocketId("host-socket");

    expect(roomAfterDisconnect?.hostId).toBe(hostJoin.playerId);
    expect(roomAfterDisconnect?.players).toHaveLength(2);
    expect(
      roomAfterDisconnect?.players.find(
        (player) => player.id === hostJoin.playerId,
      ),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "disconnected",
        isHost: true,
      }),
    );
    expect(
      roomAfterDisconnect?.players.find(
        (player) => player.id === guestJoin.playerId,
      ),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: false,
      }),
    );
  });

  it("restores a disconnected host as the same host player during the transfer grace period", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.addPlayerToRoom(
      "former-host-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "former-host-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomRegistry.startGame(
      "host-socket",
      { roomId: "former-host-room" },
      getHostTransferDeck(),
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
      restoredHostJoin.roomState.players.find(
        (player) => player.id === hostJoin.playerId,
      ),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: true,
      }),
    );
  });

  it("passes the turn to the next connected player when the active player disconnects", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.addPlayerToRoom(
      "active-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "active-turn-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    const startedRoom = roomRegistry.startGame(
      "host-socket",
      { roomId: "active-turn-room" },
      getHostTransferDeck(),
    );

    const roomAfterDisconnect =
      roomRegistry.removePlayerBySocketId("host-socket");

    expect(startedRoom.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(roomAfterDisconnect?.turn).toEqual(
      expect.objectContaining({
        activePlayerId: hostJoin.playerId,
        turnNumber: 1,
        hasUsedSkipTrackWithTt: false,
        turnSkipDeadlineEpochMs: expect.any(Number),
      }),
    );
    expect(roomAfterDisconnect?.currentTrackCard?.id).toBe(
      startedRoom.currentTrackCard?.id,
    );
    expect(roomAfterDisconnect?.timelines[hostJoin.playerId]).toBeDefined();
  });

  it("does not pass the turn when no connected replacement player exists", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.addPlayerToRoom(
      "solo-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomRegistry.startGame(
      "host-socket",
      { roomId: "solo-turn-room" },
      getHostTransferDeck(),
    );

    const roomAfterDisconnect =
      roomRegistry.removePlayerBySocketId("host-socket");

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
    roomRegistry.addPlayerToRoom(
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
    const hostJoin = roomRegistry.addPlayerToRoom(
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

function getHostTransferDeck(): GameTrackCard[] {
  return [
    {
      id: "host-transfer-track-1",
      title: "Track 1",
      artist: "Artist 1",
      albumTitle: "Album 1",
      releaseYear: 1980,
    },
    {
      id: "host-transfer-track-2",
      title: "Track 2",
      artist: "Artist 2",
      albumTitle: "Album 2",
      releaseYear: 1990,
    },
    {
      id: "host-transfer-track-3",
      title: "Track 3",
      artist: "Artist 3",
      albumTitle: "Album 3",
      releaseYear: 2000,
    },
    {
      id: "host-transfer-track-4",
      title: "Track 4",
      artist: "Artist 4",
      albumTitle: "Album 4",
      releaseYear: 2010,
    },
  ];
}
