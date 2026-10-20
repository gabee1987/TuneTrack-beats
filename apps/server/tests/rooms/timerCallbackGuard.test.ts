import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import { RoomTimerCoordinator } from "../../src/rooms/RoomTimerCoordinator.js";
import type { RoomStore } from "../../src/rooms/RoomStore.js";

const TEST_ROOM_ID = "TEST_ROOM_1";
const TEST_SESSION_ID = "session-12345";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function createTimers(): RoomTimerCoordinator {
  return new RoomTimerCoordinator({} as RoomStore, 100, 100, 100, 100);
}

function throwingCallback(): never {
  throw new Error("PLAYER_TIMELINE_NOT_FOUND");
}

describe("room timer callbacks", () => {
  const scheduleThrowingTimer: Record<string, (timers: RoomTimerCoordinator) => void> = {
    challenge: (timers) => timers.scheduleChallenge(TEST_ROOM_ID, 100, throwingCallback),
    reconnect: (timers) => timers.scheduleReconnect(TEST_SESSION_ID, 100, throwingCallback),
    host_transfer: (timers) => timers.scheduleHostTransfer(TEST_ROOM_ID, 100, throwingCallback),
    turn_skip: (timers) => timers.scheduleTurnSkip(TEST_SESSION_ID, 100, throwingCallback),
    all_players_offline: (timers) =>
      timers.scheduleAllPlayersOffline(TEST_ROOM_ID, throwingCallback),
  };

  for (const [timerKind, schedule] of Object.entries(scheduleThrowingTimer)) {
    it(`logs a throwing ${timerKind} callback instead of crashing the process`, () => {
      vi.useFakeTimers();
      const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);
      const timers = createTimers();

      schedule(timers);

      expect(() => vi.advanceTimersByTime(100)).not.toThrow();
      expect(logError).toHaveBeenCalledWith(
        expect.objectContaining({ timerKind, err: expect.any(Error) }),
        "room timer callback failed",
      );
    });
  }

  it("keeps running other timers after one callback throws", () => {
    vi.useFakeTimers();
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const timers = createTimers();
    const laterCallback = vi.fn();

    timers.scheduleChallenge(TEST_ROOM_ID, 100, throwingCallback);
    timers.scheduleTurnSkip(TEST_SESSION_ID, 200, laterCallback);
    vi.advanceTimersByTime(200);

    expect(laterCallback).toHaveBeenCalledTimes(1);
  });
});
