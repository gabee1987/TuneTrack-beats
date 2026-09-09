import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSocketClient, resetSocketClient } from "./socketClient";

interface StubSocket {
  connected: boolean;
  sendBuffer: unknown[];
  receiveBuffer: unknown[];
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

function createStubSocket(): StubSocket {
  const socket: StubSocket = {
    connected: false,
    sendBuffer: [],
    receiveBuffer: [],
    // Socket.IO queues rather than throws while offline; the stub mirrors that.
    emit: vi.fn((event: string, payload: unknown) => {
      if (!socket.connected) {
        socket.sendBuffer.push({ event, payload });
      }
      return socket;
    }),
    disconnect: vi.fn(() => socket),
    removeAllListeners: vi.fn(() => socket),
  };

  return socket;
}

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => createStubSocket()),
}));

describe("socketClient", () => {
  beforeEach(() => {
    resetSocketClient();
  });

  it("hands every consumer the same instance", async () => {
    const [first, second] = await Promise.all([getSocketClient(), getSocketClient()]);

    expect(first).toBe(second);
  });

  /**
   * Queued packets are the right behaviour across a brief blip and the wrong behaviour
   * across a reset: the room they belonged to is gone, so the replay lands on whatever room
   * the player joins next. A closed room produced a burst of placements against a room that
   * no longer existed (defect B15).
   */
  it("drops queued packets when the client is reset", async () => {
    const socket = (await getSocketClient()) as unknown as StubSocket;
    socket.emit("place_card", { selectedSlotIndex: 0 });
    expect(socket.sendBuffer).toHaveLength(1);

    resetSocketClient();

    expect(socket.sendBuffer).toEqual([]);
    expect(socket.disconnect).toHaveBeenCalled();
  });

  /**
   * A reset landing while the socket module is still importing used to hand the caller the
   * discarded socket. The caller connected that one and registered its listeners on it,
   * while every other consumer emitted on the instance that replaced it.
   */
  it("never hands out a socket a concurrent reset discarded", async () => {
    const pending = getSocketClient();
    resetSocketClient();

    await expect(pending).resolves.toBe(await getSocketClient());
  });
});
