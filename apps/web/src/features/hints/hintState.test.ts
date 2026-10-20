import { describe, expect, it } from "vitest";
import { MemoryStorage, ThrowingStorage } from "../../test/stubs/storage";
import {
  type HintId,
  isHintsEnabled,
  hintStateStorageKey,
  markHintSeen,
  readHintState,
  resetHints,
  setHintsEnabled,
} from "./hintState";

function hasSeenHint(id: HintId, storage: Storage): boolean {
  return (readHintState(storage).seenCounts[id] ?? 0) > 0;
}

describe("hintState", () => {
  it("records a hint once and can reset it", () => {
    const storage = new MemoryStorage();

    expect(hasSeenHint("game-timeline-tap", storage)).toBe(false);
    markHintSeen("game-timeline-tap", storage);
    expect(hasSeenHint("game-timeline-tap", storage)).toBe(true);

    resetHints(storage);
    expect(readHintState(storage).seenCounts).toEqual({});
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

  it("persists the master switch without erasing seen hints", () => {
    const storage = new MemoryStorage();
    markHintSeen("game-drag-preview", storage);

    setHintsEnabled(false, storage);
    expect(isHintsEnabled(storage)).toBe(false);
    expect(hasSeenHint("game-drag-preview", storage)).toBe(true);

    setHintsEnabled(true, storage);
    expect(isHintsEnabled(storage)).toBe(true);
    expect(hasSeenHint("game-drag-preview", storage)).toBe(true);
  });
});
