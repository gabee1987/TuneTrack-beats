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
 * Socket.IO queues packets emitted while offline and flushes them on the next connect,
 * which is what you want across a brief blip. It is not what you want across a reset: the
 * room those packets belonged to is gone, and the replay arrives at whatever room the
 * player is in next. The buffer has to die with the socket that holds it.
 */
function discardSocketClient(socketClient: Socket) {
  socketClient.removeAllListeners();
  socketClient.disconnect();
  socketClient.sendBuffer = [];
  socketClient.receiveBuffer = [];
}

async function createSocketClient(): Promise<Socket> {
  const generation = socketClientGeneration;
  const { io } = await import("socket.io-client");
  const nextSocketClient = io(resolveSocketServerUrl(), {
    autoConnect: false,
  });

  if (generation !== socketClientGeneration) {
    // Handing this back would strand the caller: it connects the socket and registers its
    // listeners there, while every other consumer emits on the instance that replaced it.
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
