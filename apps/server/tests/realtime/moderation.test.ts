import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ServerErrorPayload,
} from "@tunetrack/shared";
import { describe, expect, it, vi } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { turnOrderDeck } from "../support/decks.js";
import { expectAppliedOnce, openTwoPlayerLobby, sendTwice } from "../support/roomFixtures.js";
import { createTestRoomService, startSocketTestServer } from "../support/socketTestServer.js";
import { nextEvent, waitForStateUpdate } from "../support/waiters.js";

interface RoomClosedPayload {
  roomId: string;
  message: string;
  reason?: string;
  roomName?: string;
}

describe("host moderation over sockets", () => {
  it("transfers host controls once when the request is replayed", async () => {
    const roomService = createTestRoomService();
    const transferHostSpy = vi.spyOn(roomService, "transferHost");
    const { host, guest } = await openTwoPlayerLobby(
      await startSocketTestServer(roomService),
      "xfer-room",
    );
    const transferredPromise = waitForStateUpdate(
      guest.socket,
      (state) => state.hostId === guest.playerId,
    );

    const requestId = "00000000-0000-4000-8000-00000000010b";
    const acks = await sendTwice(host.socket, ClientToServerEvent.TransferHost, {
      roomId: "xfer-room",
      playerId: guest.playerId,
      requestId,
    });

    expectAppliedOnce(acks, requestId, transferHostSpy);
    expect((await transferredPromise).players).toEqual([
      expect.objectContaining({ id: host.playerId, isHost: false }),
      expect.objectContaining({ id: guest.playerId, isHost: true }),
    ]);
  });

  it("moves settings rights to the new host after a transfer", async () => {
    const { host, guest } = await openTwoPlayerLobby(await startSocketTestServer(), "xfer-room");
    const transferredPromise = waitForStateUpdate(
      guest.socket,
      (state) => state.hostId === guest.playerId,
    );
    host.socket.emit(ClientToServerEvent.TransferHost, {
      roomId: "xfer-room",
      playerId: guest.playerId,
    });
    await transferredPromise;
    const settings = { roomId: "xfer-room", targetTimelineCardCount: 12 };

    const oldHostErrorPromise = nextEvent<ServerErrorPayload>(
      host.socket,
      ServerToClientEvent.Error,
    );
    host.socket.emit(ClientToServerEvent.UpdateRoomSettings, settings);
    await expect(oldHostErrorPromise).resolves.toEqual({
      code: "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS",
      message: "Only the host can change room settings.",
    });

    const updatedPromise = waitForStateUpdate(
      host.socket,
      (state) => state.targetTimelineCardCount === 12,
    );
    guest.socket.emit(ClientToServerEvent.UpdateRoomSettings, settings);
    await expect(updatedPromise).resolves.toEqual(
      expect.objectContaining({ hostId: guest.playerId, targetTimelineCardCount: 12 }),
    );
  });

  it("lets the host close the room for everyone once when replayed", async () => {
    const roomService = createTestRoomService();
    const closeRoomSpy = vi.spyOn(roomService, "closeRoom");
    const { host, guest } = await openTwoPlayerLobby(
      await startSocketTestServer(roomService),
      "close-room",
    );
    const closedPromise = nextEvent<RoomClosedPayload>(
      guest.socket,
      ServerToClientEvent.RoomClosed,
    );

    const requestId = "00000000-0000-4000-8000-000000000105";
    const acks = await sendTwice(host.socket, ClientToServerEvent.CloseRoom, {
      roomId: "close-room",
      requestId,
    });

    await expect(closedPromise).resolves.toEqual({
      roomId: "close-room",
      message: "The host closed this room.",
    });
    expectAppliedOnce(acks, requestId, closeRoomSpy);
  });

  it("notifies a kicked player once so their client can leave the room", async () => {
    const roomService = createTestRoomService();
    const kickPlayerSpy = vi.spyOn(roomService, "kickPlayer");
    const { host, guest } = await openTwoPlayerLobby(
      await startSocketTestServer(roomService),
      "kick-room",
    );
    const kickedNotifications = vi.fn();
    guest.socket.on(ServerToClientEvent.RoomClosed, kickedNotifications);
    const kickedPromise = nextEvent<RoomClosedPayload>(
      guest.socket,
      ServerToClientEvent.RoomClosed,
    );
    const hostStatePromise = waitForStateUpdate(
      host.socket,
      (state) => !state.players.some((player) => player.id === guest.playerId),
    );

    const requestId = "00000000-0000-4000-8000-00000000010c";
    const acks = await sendTwice(host.socket, ClientToServerEvent.KickPlayer, {
      roomId: "kick-room",
      playerId: guest.playerId,
      requestId,
    });

    await expect(kickedPromise).resolves.toEqual({
      roomId: "kick-room",
      reason: "kicked",
      roomName: "kick-room",
      message: "You were removed from this room.",
    });
    await expect(hostStatePromise).resolves.toEqual(
      expect.objectContaining({ roomId: "kick-room" }),
    );
    expectAppliedOnce(acks, requestId, kickPlayerSpy);
    expect(kickedNotifications).toHaveBeenCalledTimes(1);
  });
});

describe("host moderation in the registry", () => {
  function startThreePlayerGame(roomId: string, thirdName: string) {
    const roomRegistry = new RoomRegistry();
    const host = roomRegistry.createRoom(roomId, "Host Player", "host-socket", "host-session");
    const guest = roomRegistry.addPlayerToRoom(
      roomId,
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    const third = roomRegistry.addPlayerToRoom(roomId, thirdName, "third-socket", "third-session");
    roomRegistry.startGame("host-socket", { roomId }, turnOrderDeck());
    roomRegistry.placeCard("host-socket", { roomId, selectedSlotIndex: 1 });
    const guestTurn = roomRegistry.confirmReveal("host-socket", { roomId });
    expect(guestTurn.turn?.activePlayerId).toBe(guest.playerId);
    return { roomRegistry, host, guest, third };
  }

  it("removes kicked players from future turn order during a game", () => {
    const { roomRegistry, host, guest, third } = startThreePlayerGame(
      "kick-turn-room",
      "Kicked Guest",
    );

    const afterKick = roomRegistry.kickPlayer("host-socket", {
      roomId: "kick-turn-room",
      playerId: third.playerId,
    }).roomState;
    expect(afterKick.turn?.activePlayerId).toBe(guest.playerId);
    expect(afterKick.players.map((player) => player.id)).not.toContain(third.playerId);

    roomRegistry.placeCard("guest-socket", { roomId: "kick-turn-room", selectedSlotIndex: 0 });
    const hostTurn = roomRegistry.confirmReveal("host-socket", { roomId: "kick-turn-room" });

    expect(hostTurn.turn?.activePlayerId).toBe(host.playerId);
    expect(hostTurn.players.map((player) => player.id)).not.toContain(third.playerId);
  });

  it("retains a disconnected player after the host manually skips their turn", () => {
    vi.useFakeTimers();

    try {
      const { roomRegistry, guest, third } = startThreePlayerGame("skip-room", "Third Player");
      const disconnected = roomRegistry.removePlayerBySocketId("guest-socket");
      expect(disconnected?.players.find((player) => player.id === guest.playerId)).toEqual(
        expect.objectContaining({
          connectionStatus: "disconnected",
          reconnectExpiresAtEpochMs: null,
        }),
      );

      const afterSkip = roomRegistry.skipTurn("host-socket", { roomId: "skip-room" });
      expect(afterSkip.turn?.activePlayerId).toBe(third.playerId);
      expect(afterSkip.players.map((player) => player.id)).toContain(guest.playerId);

      vi.advanceTimersByTime(24 * 60 * 60 * 1_000);
      const retained = roomRegistry.getRoomStateForMember("host-socket", "skip-room");
      expect(retained.players.find((player) => player.id === guest.playerId)).toEqual(
        expect.objectContaining({ connectionStatus: "disconnected" }),
      );

      const restored = roomRegistry.addPlayerToRoom(
        "skip-room",
        "Guest Player",
        "restored-guest-socket",
        "guest-session",
      );
      expect(restored.playerId).toBe(guest.playerId);
      expect(restored.roomState.players.find((player) => player.id === guest.playerId)).toEqual(
        expect.objectContaining({ connectionStatus: "connected" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
