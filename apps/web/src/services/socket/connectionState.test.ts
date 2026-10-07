import { act, renderHook } from "@testing-library/react";
import { ServerToClientEvent } from "@tunetrack/shared/client";
import type { Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeSocket, type FakeSocket } from "../../test/fakeSocket";
import {
  getConnectionStatus,
  hasServerRestarted,
  trackSocketConnection,
  useConnectionStatus,
} from "./connectionState";

let untrack: (() => void) | null = null;

function track(socket: FakeSocket): void {
  untrack = trackSocketConnection(socket as unknown as Socket);
}

function setBrowserOnline(isOnline: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnline);
  window.dispatchEvent(new Event(isOnline ? "online" : "offline"));
}

describe("connectionState", () => {
  afterEach(() => {
    untrack?.();
    untrack = null;
    vi.restoreAllMocks();
  });

  it("starts as connecting and becomes connected on the first connect", () => {
    const socket = createFakeSocket();
    track(socket);
    expect(getConnectionStatus()).toBe("connecting");

    socket.simulateConnect();

    expect(getConnectionStatus()).toBe("connected");
  });

  it("starts as connected when the socket is already connected", () => {
    track(createFakeSocket({ connected: true }));

    expect(getConnectionStatus()).toBe("connected");
  });

  it("reports reconnecting after a drop and connected after recovery", () => {
    const socket = createFakeSocket();
    track(socket);
    socket.simulateConnect();

    socket.simulateDisconnect("transport close");
    expect(getConnectionStatus()).toBe("reconnecting");

    socket.simulateConnect();
    expect(getConnectionStatus()).toBe("connected");
  });

  it("reports reconnecting when the first connect attempt fails and retries", () => {
    const socket = createFakeSocket();
    track(socket);

    socket.simulateReconnectAttempt();

    expect(getConnectionStatus()).toBe("reconnecting");
  });

  it("reports offline while the browser has no network, whatever else happened", () => {
    const socket = createFakeSocket();
    track(socket);
    socket.simulateConnect();
    socket.simulateDisconnect();

    setBrowserOnline(false);
    expect(getConnectionStatus()).toBe("offline");

    setBrowserOnline(true);
    expect(getConnectionStatus()).toBe("reconnecting");
  });

  it("reports server_restarting from the shutdown notice until the socket reconnects", () => {
    const socket = createFakeSocket();
    track(socket);
    socket.simulateConnect();

    socket.serverEmit(ServerToClientEvent.ServerShuttingDown);
    socket.simulateDisconnect("transport close");
    expect(getConnectionStatus()).toBe("server_restarting");
    socket.simulateReconnectAttempt();
    expect(getConnectionStatus()).toBe("server_restarting");

    socket.simulateConnect();
    expect(getConnectionStatus()).toBe("connected");
    expect(hasServerRestarted()).toBe(true);
  });

  it("forgets everything when the socket is untracked", () => {
    const socket = createFakeSocket();
    track(socket);
    socket.simulateConnect();
    socket.serverEmit(ServerToClientEvent.ServerShuttingDown);

    untrack?.();
    untrack = null;
    socket.simulateDisconnect();

    expect(getConnectionStatus()).toBe("connecting");
    expect(hasServerRestarted()).toBe(false);
    expect(socket.listenerCount("connect")).toBe(0);
  });

  it("re-renders subscribers on every status change", () => {
    const socket = createFakeSocket();
    track(socket);
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current).toBe("connecting");

    act(() => socket.simulateConnect());
    expect(result.current).toBe("connected");

    act(() => socket.simulateDisconnect());
    expect(result.current).toBe("reconnecting");
  });
});
