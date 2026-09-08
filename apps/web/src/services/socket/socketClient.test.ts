import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emitWhenConnected,
  getSocketClient,
  resetSocketClient,
} from "./socketClient";

interface StubSocket {
  connected: boolean;
  sendBuffer: unknown[];
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

const createdSockets: StubSocket[] = [];

function createStubSocket(): StubSocket {
  const socket: StubSocket = {
    connected: false,
    sendBuffer: [],
    emit: vi.fn((event: string, payload: unknown) => {
      if (!socket.connected) {
        socket.sendBuffer.push({ event, payload });
      }
      return socket;
    }),
    disconnect: vi.fn(() => socket),
    removeAllListeners: vi.fn(() => socket),
  };

  createdSockets.push(socket);
  return socket;
}

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => createStubSocket()),
}));

describe("socketClient", () => {
  beforeEach(() => {
    resetSocketClient();
    createdSockets.length = 0;
  });

  /**
   * Socket.IO queues emits made while offline and replays them on the next connect. In a
   * game that replay lands on a room the player has already left, so an undeliverable
   * action must be dropped and reported instead.
   */
  it("refuses to emit while the socket is disconnected", async () => {
    const socket = await getSocketClient();

    await expect(emitWhenConnected("place_card", { selectedSlotIndex: 0 })).resolves.toBe(
      false,
    );
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("emits and reports delivery once the socket is connected", async () => {
    const socket = await getSocketClient();
    socket.connected = true;

    await expect(emitWhenConnected("place_card", { selectedSlotIndex: 0 })).resolves.toBe(
      true,
    );
    expect(socket.emit).toHaveBeenCalledWith("place_card", { selectedSlotIndex: 0 });
  });

  it("drops any queued packets when the client is reset", async () => {
    const socket = await getSocketClient();
    socket.emit("place_card", { selectedSlotIndex: 0 });
    expect(socket.sendBuffer).toHaveLength(1);

    resetSocketClient();

    expect(socket.sendBuffer).toEqual([]);
    expect(socket.disconnect).toHaveBeenCalled();
  });

  /**
   * A reset while the socket module is still importing used to hand the caller the
   * discarded socket: it would connect that one and register its listeners there, while
   * every other consumer emitted on the instance that replaced it.
   */
  it("never hands out a socket that a concurrent reset discarded", async () => {
    const pendingSocket = getSocketClient();
    resetSocketClient();

    const socket = await pendingSocket;
    const currentSocket = await getSocketClient();

    expect(socket).toBe(currentSocket);
  });
});
