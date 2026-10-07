import { ServerToClientEvent } from "@tunetrack/shared/client";
import { useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "server_restarting";

interface ConnectionFacts {
  isConnected: boolean;
  hasConnectionDropped: boolean;
  isServerRestarting: boolean;
  isBrowserOffline: boolean;
  /** Survives the reconnect, so a later `ROOM_NOT_FOUND` can be explained as a restart. */
  didServerRestart: boolean;
}

type TrackedSocket = Pick<Socket, "connected" | "on" | "off"> & {
  io: Pick<Socket["io"], "on" | "off">;
};

const INITIAL_FACTS: ConnectionFacts = {
  isConnected: false,
  hasConnectionDropped: false,
  isServerRestarting: false,
  isBrowserOffline: false,
  didServerRestart: false,
};

let facts: ConnectionFacts = INITIAL_FACTS;
let status: ConnectionStatus = "connecting";
const listeners = new Set<() => void>();

function deriveStatus(current: ConnectionFacts): ConnectionStatus {
  if (current.isConnected) return "connected";
  if (current.isBrowserOffline) return "offline";
  if (current.isServerRestarting) return "server_restarting";
  if (current.hasConnectionDropped) return "reconnecting";
  return "connecting";
}

function updateFacts(change: Partial<ConnectionFacts>): void {
  facts = { ...facts, ...change };
  const nextStatus = deriveStatus(facts);
  if (nextStatus === status) return;
  status = nextStatus;
  for (const listener of listeners) listener();
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Follows one socket until the returned function is called; a new socket starts from scratch. */
export function trackSocketConnection(socket: TrackedSocket): () => void {
  const handleConnect = () =>
    updateFacts({ isConnected: true, hasConnectionDropped: false, isServerRestarting: false });
  const handleDisconnect = () => updateFacts({ isConnected: false, hasConnectionDropped: true });
  const handleReconnectAttempt = () => updateFacts({ hasConnectionDropped: true });
  const handleServerShuttingDown = () =>
    updateFacts({ isServerRestarting: true, didServerRestart: true });
  const handleBrowserOffline = () => updateFacts({ isBrowserOffline: true });
  const handleBrowserOnline = () => updateFacts({ isBrowserOffline: false });

  updateFacts({
    ...INITIAL_FACTS,
    isConnected: socket.connected,
    isBrowserOffline: isBrowserOffline(),
  });
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on(ServerToClientEvent.ServerShuttingDown, handleServerShuttingDown);
  socket.io.on("reconnect_attempt", handleReconnectAttempt);
  window.addEventListener("offline", handleBrowserOffline);
  window.addEventListener("online", handleBrowserOnline);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off(ServerToClientEvent.ServerShuttingDown, handleServerShuttingDown);
    socket.io.off("reconnect_attempt", handleReconnectAttempt);
    window.removeEventListener("offline", handleBrowserOffline);
    window.removeEventListener("online", handleBrowserOnline);
    updateFacts(INITIAL_FACTS);
  };
}

export function getConnectionStatus(): ConnectionStatus {
  return status;
}

export function hasServerRestarted(): boolean {
  return facts.didServerRestart;
}

function subscribeToConnectionStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(subscribeToConnectionStatus, getConnectionStatus);
}
