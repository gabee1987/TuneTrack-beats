import { ClientToServerEvent } from "@tunetrack/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emitAction } from "./emitAction";

const socket = vi.hoisted(() => ({
  connected: true,
  timeout: vi.fn(),
  emitWithAck: vi.fn(),
}));

const getSocketClient = vi.hoisted(() => vi.fn());

vi.mock("./socketClient", () => ({ getSocketClient }));

beforeEach(() => {
  socket.connected = true;
  socket.timeout.mockReturnValue(socket);
  socket.emitWithAck.mockReset();
  getSocketClient.mockResolvedValue(socket);
});

describe("emitAction", () => {
  it("returns ok after the server accepts the action", async () => {
    socket.emitWithAck.mockResolvedValue({
      ok: true,
      requestId: "00000000-0000-4000-8000-000000000001",
    });

    await expect(
      emitAction(ClientToServerEvent.StartGame, { roomId: "TEST_ROOM_1" }),
    ).resolves.toEqual({ status: "ok" });
    expect(socket.timeout).toHaveBeenCalledWith(8_000);
    expect(socket.emitWithAck).toHaveBeenCalledWith(
      ClientToServerEvent.StartGame,
      expect.objectContaining({
        roomId: "TEST_ROOM_1",
        requestId: expect.any(String),
      }),
    );
  });

  it("returns the server rejection code", async () => {
    socket.emitWithAck.mockResolvedValue({
      ok: false,
      requestId: "00000000-0000-4000-8000-000000000002",
      code: "ONLY_HOST_CAN_START_GAME",
    });

    await expect(
      emitAction(ClientToServerEvent.StartGame, { roomId: "TEST_ROOM_1" }),
    ).resolves.toEqual({
      status: "rejected",
      code: "ONLY_HOST_CAN_START_GAME",
    });
  });

  it("returns timeout when the acknowledgement does not arrive", async () => {
    socket.emitWithAck.mockRejectedValue(new Error("operation has timed out"));

    await expect(
      emitAction(ClientToServerEvent.StartGame, { roomId: "TEST_ROOM_1" }),
    ).resolves.toEqual({ status: "timeout" });
  });

  it("returns offline without emitting or buffering the action", async () => {
    socket.connected = false;

    await expect(
      emitAction(ClientToServerEvent.StartGame, { roomId: "TEST_ROOM_1" }),
    ).resolves.toEqual({ status: "offline" });
    expect(socket.timeout).not.toHaveBeenCalled();
    expect(socket.emitWithAck).not.toHaveBeenCalled();
  });
});
