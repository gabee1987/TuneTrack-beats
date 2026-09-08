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

async function createSocketClient(): Promise<Socket> {
  const generation = socketClientGeneration;
  const { io } = await import("socket.io-client");
  const nextSocketClient = io(resolveSocketServerUrl(), {
    autoConnect: false,
  });

  if (generation !== socketClientGeneration) {
    nextSocketClient.removeAllListeners();
    nextSocketClient.disconnect();
    return nextSocketClient;
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
  socketClientInstance?.removeAllListeners();
  socketClientInstance?.disconnect();
  socketClientInstance = null;
  socketClientPromise = null;
}
