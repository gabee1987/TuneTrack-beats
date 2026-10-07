import { EventEmitter } from "node:events";
import { ServerToClientEvent } from "@tunetrack/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerGracefulShutdown,
  SHUTDOWN_DEADLINE_MS,
  SOCKET_DRAIN_MS,
} from "../../src/app/shutdown.js";
import { RoomStore } from "../../src/rooms/RoomStore.js";
import { RoomTimerCoordinator } from "../../src/rooms/RoomTimerCoordinator.js";

interface ShutdownHarnessOptions {
  closeSocketServer?: () => Promise<void>;
  flushAuditLog?: () => Promise<void>;
}

function createShutdownHarness(options: ShutdownHarnessOptions = {}) {
  const fakeProcess = new EventEmitter();
  const steps: string[] = [];
  const timers = new RoomTimerCoordinator(new RoomStore(), 30_000, 30_000, 60_000, 3_600_000);
  const roomTimerCallback = vi.fn();
  timers.scheduleChallenge("TEST_ROOM_1", 10_000, roomTimerCallback);
  timers.scheduleReconnect("TEST_SESSION_1", 30_000, roomTimerCallback);
  timers.scheduleHostTransfer("TEST_ROOM_1", 30_000, roomTimerCallback);
  timers.scheduleTurnSkip("TEST_SESSION_1", 60_000, roomTimerCallback);
  timers.scheduleAllPlayersOffline("TEST_ROOM_1", roomTimerCallback);

  const socketServer = {
    emit: vi.fn((event: string) => {
      steps.push(`emit:${event}`);
    }),
    close: vi.fn(() => {
      steps.push("close");
      return options.closeSocketServer?.() ?? Promise.resolve();
    }),
  };
  const exit = vi.fn((code: number) => {
    steps.push(`exit:${code}`);
  });
  const log = { info: vi.fn(), error: vi.fn() };

  registerGracefulShutdown(fakeProcess, {
    socketServer,
    clearRoomTimers: () => {
      steps.push("clearTimers");
      timers.clearAll();
    },
    recordServerStopped: (signal) => steps.push(`stopped:${signal}`),
    flushAuditLog: () => {
      steps.push("flush");
      return options.flushAuditLog?.() ?? Promise.resolve();
    },
    log,
    exit,
  });

  return { exit, fakeProcess, log, roomTimerCallback, socketServer, steps };
}

describe("graceful shutdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs one ordered sequence for repeated signals and exits cleanly", async () => {
    const { exit, fakeProcess, socketServer, steps } = createShutdownHarness();

    fakeProcess.emit("SIGTERM");
    fakeProcess.emit("SIGINT");
    fakeProcess.emit("SIGTERM");
    await vi.runAllTimersAsync();

    expect(steps).toEqual([
      "clearTimers",
      `emit:${ServerToClientEvent.ServerShuttingDown}`,
      "close",
      "stopped:SIGTERM",
      "flush",
      "exit:0",
    ]);
    expect(socketServer.close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("leaves no room timer pending and never fires one", async () => {
    const { fakeProcess, roomTimerCallback } = createShutdownHarness();

    fakeProcess.emit("SIGINT");
    await vi.advanceTimersByTimeAsync(0);

    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(roomTimerCallback).not.toHaveBeenCalled();
  });

  it("stops waiting for open connections after the drain window", async () => {
    const { exit, fakeProcess, steps } = createShutdownHarness({
      closeSocketServer: () => new Promise<void>(() => undefined),
    });

    fakeProcess.emit("SIGTERM");
    await vi.advanceTimersByTimeAsync(SOCKET_DRAIN_MS - 1);
    expect(steps).not.toContain("stopped:SIGTERM");

    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledWith(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exits with a failure code when a step outlives the deadline", async () => {
    const { exit, fakeProcess, log } = createShutdownHarness({
      flushAuditLog: () => new Promise<void>(() => undefined),
    });

    fakeProcess.emit("SIGTERM");
    await vi.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS - 1);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ signal: "SIGTERM" }),
      "shutdown timed out, exiting",
    );
  });

  it("exits with a failure code when a step throws", async () => {
    const { exit, fakeProcess } = createShutdownHarness({
      closeSocketServer: () => Promise.reject(new Error("TEST_CLOSE_FAILURE")),
    });

    fakeProcess.emit("SIGINT");
    await vi.runAllTimersAsync();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
