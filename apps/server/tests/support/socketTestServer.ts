import type { GameTrackCard } from "@tunetrack/game-engine";
import { io as createSocketClient, type Socket } from "socket.io-client";
import { afterEach } from "vitest";
import { createHttpServer } from "../../src/app/createHttpServer.js";
import type { RoomServices } from "../../src/app/createRoomServices.js";
import { createSocketServer } from "../../src/app/createSocketServer.js";
import { registerSocketHandlers } from "../../src/realtime/registerSocketHandlers.js";
import type { RoomTimerCoordinator } from "../../src/rooms/RoomTimerCoordinator.js";
import { createTestRoomServices } from "./roomServices.js";

export { nextEvent } from "./waiters.js";

/**
 * A real Socket.IO server on a free port with the production handlers, and connected clients.
 * Everything a test opens is closed after it, and the room timers it started are cleared so
 * none fires into a later test.
 */
const sockets: Socket[] = [];
const closers: Array<() => Promise<void>> = [];
const roomTimers: RoomTimerCoordinator[] = [];

afterEach(async () => {
  sockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.disconnect();
  });
  sockets.length = 0;
  await Promise.all(closers.map((close) => close()));
  closers.length = 0;
  roomTimers.forEach((timers) => timers.clearAll());
  roomTimers.length = 0;
});

export interface SocketTestServicesOptions {
  /** Dealt in this order instead of the shuffled practice deck. */
  deck?: readonly GameTrackCard[];
  reconnectGracePeriodMs?: number;
}

/** Short grace periods so lifecycle tests run in milliseconds. */
export function createSocketTestServices(options: SocketTestServicesOptions = {}): RoomServices {
  return createTestRoomServices({
    ...(options.deck ? { deck: options.deck } : {}),
    durations: {
      reconnectGracePeriodMs: options.reconnectGracePeriodMs ?? 500,
      hostTransferGracePeriodMs: 25,
      turnSkipGracePeriodMs: 25,
    },
  });
}

export async function startSocketTestServer(
  services = createSocketTestServices(),
): Promise<string> {
  roomTimers.push(services.timers);
  const { httpServer } = createHttpServer();
  const io = createSocketServer(httpServer);
  registerSocketHandlers(io, services);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  closers.push(() => new Promise<void>((resolve) => io.close(() => resolve())));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind the test server.");
  }
  return `http://localhost:${address.port}`;
}

export async function connectTestClient(baseUrl: string): Promise<Socket> {
  const socket = createSocketClient(baseUrl, {
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });
  sockets.push(socket);
  await new Promise<void>((resolve) => socket.once("connect", () => resolve()));
  return socket;
}
