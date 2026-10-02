import { describe, expect, it } from "vitest";
import { MemoryStorage, ThrowingStorage } from "../../test/stubs/storage";
import {
  hasSeenHint,
  hintStateStorageKey,
  markHintSeen,
  readHintState,
  resetHints,
} from "./hintState";

describe("hintState", () => {
  it("records a hint once and can reset it", () => {
    const storage = new MemoryStorage();

    expect(hasSeenHint("game-timeline-tap", storage)).toBe(false);
    markHintSeen("game-timeline-tap", storage);
    expect(hasSeenHint("game-timeline-tap", storage)).toBe(true);

    resetHints(storage);
    expect(storage.getItem(hintStateStorageKey)).toBeNull();
  });

  it("resets incompatible persisted versions", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      hintStateStorageKey,
      JSON.stringify({ version: 0, seenCounts: { "game-timeline-tap": 1 } }),
    );

    expect(hasSeenHint("game-timeline-tap", storage)).toBe(false);
  });

  it("degrades to enabled but unremembered when storage is blocked", () => {
    const storage = new ThrowingStorage();

    expect(readHintState(storage).seenCounts).toEqual({});
    expect(() => markHintSeen("game-timeline-tap", storage)).not.toThrow();
    expect(() => resetHints(storage)).not.toThrow();
  });
});
