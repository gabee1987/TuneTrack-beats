import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyedTimerManager } from "../../src/rooms/KeyedTimerManager.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("KeyedTimerManager", () => {
  it("runs the callback once after the delay and forgets the key", () => {
    vi.useFakeTimers();
    const timers = new KeyedTimerManager("reconnect");
    const callback = vi.fn();

    timers.schedule("session-12345", 100, callback);
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    expect(timers.has("session-12345")).toBe(true);

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timers.has("session-12345")).toBe(false);
  });

  it("replaces a pending timer when the same key is scheduled again", () => {
    vi.useFakeTimers();
    const timers = new KeyedTimerManager("challenge");
    const first = vi.fn();
    const second = vi.fn();

    timers.schedule("TEST_ROOM_1", 100, first);
    vi.advanceTimersByTime(50);
    timers.schedule("TEST_ROOM_1", 100, second);
    vi.advanceTimersByTime(100);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("keeps keys independent and clears one or all", () => {
    vi.useFakeTimers();
    const timers = new KeyedTimerManager("turn_skip");
    const cleared = vi.fn();
    const kept = vi.fn();
    const clearedByAll = vi.fn();

    timers.schedule("session-1", 100, cleared);
    timers.schedule("session-2", 100, kept);
    timers.clear("session-1");
    vi.advanceTimersByTime(100);

    timers.schedule("session-3", 100, clearedByAll);
    timers.clearAll();
    vi.advanceTimersByTime(100);

    expect(cleared).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
    expect(clearedByAll).not.toHaveBeenCalled();
  });
});
