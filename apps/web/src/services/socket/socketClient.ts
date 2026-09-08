import type { Socket } from "socket.io-client";
import { resolveServerUrl } from "./resolveServerUrl";

let socketClientInstance: Socket | null = null;
let socketClientPromise: Promise<Socket> | null = null;
let socketClientGeneration = 0;

function resolveSocketServerUrl(): string {
  return resolveServerUrl({
    envServerUrl: import.meta.env.VITE_SERVER_URL,
    locationHostname: typeof window !== "undefined" ? window.location.hostname : undefined,
    locationProtocol: typeof window !== "undefined" ? window.location.protocol : undefined,
  });
}

/**
 * Socket.IO keeps packets emitted while offline in `sendBuffer` and flushes them on the
 * next connect. A room action that survives a reset is replayed against a room the player
 * has already left, so the buffer must die with the socket.
 */
function discardSocketClient(socketClient: Socket) {
  socketClient.removeAllListeners();
  socketClient.disconnect();
  socketClient.sendBuffer = [];
}

async function createSocketClient(): Promise<Socket> {
  const generation = socketClientGeneration;
  const { io } = await import("socket.io-client");
  const nextSocketClient = io(resolveSocketServerUrl(), {
    autoConnect: false,
  });

  if (generation !== socketClientGeneration) {
    // Handing the caller a socket that is no longer the shared instance strands it: the
    // caller connects it and registers its listeners there, while every other consumer
    // emits on the instance that replaced it.
    discardSocketClient(nextSocketClient);
    return getSocketClient();
  }

  socketClientInstance = nextSocketClient;
  return nextSocketClient;
}

export function getSocketClient(): Promise<Socket> {
  if (socketClientInstance) {
    return Promise.resolve(socketClientInstance);
  }

  if (!socketClientPromise) {
    socketClientPromise = createSocketClient();
  }

  return socketClientPromise;
}

/**
 * Reports whether the action reached the server. A buffered emit looks successful to the
 * caller and then either vanishes or replays much later against stale state, so an action
 * that cannot go out now is dropped and the caller is told.
 */
export async function emitWhenConnected<TPayload>(
  event: string,
  payload: TPayload,
): Promise<boolean> {
  const socketClient = await getSocketClient();

  if (!socketClient.connected) {
    return false;
  }

  socketClient.emit(event, payload);
  return true;
}

export function preloadSocketClient(): void {
  void getSocketClient();
}

export function disconnectSocketClient(): void {
  socketClientInstance?.disconnect();
}

export function resetSocketClient(): void {
  socketClientGeneration += 1;

  if (socketClientInstance) {
    discardSocketClient(socketClientInstance);
  }

  socketClientInstance = null;
  socketClientPromise = null;
}
