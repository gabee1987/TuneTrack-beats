import { describe, expect, it } from "vitest";
import { selectNextHint } from "./hintScheduler";
import type { HintState } from "./hintState";

function buildState(overrides: Partial<HintState> = {}): HintState {
  return {
    enabled: true,
    seenCounts: {},
    version: 1,
    ...overrides,
  };
}

describe("selectNextHint", () => {
  it("selects the highest-priority unseen eligible hint", () => {
    expect(
      selectNextHint({
        candidateIds: ["game-menu", "game-confirm", "game-drag-preview"],
        maxHintsPerVisit: 2,
        shownThisVisit: 0,
        state: buildState({ seenCounts: { "game-drag-preview": 1 } }),
      }),
    ).toBe("game-confirm");
  });

  it("suppresses the queue when disabled or the visit cap is reached", () => {
    const options = {
      candidateIds: ["game-menu"] as const,
      maxHintsPerVisit: 2,
      shownThisVisit: 0,
    };

    expect(selectNextHint({ ...options, state: buildState({ enabled: false }) })).toBeNull();
    expect(selectNextHint({ ...options, shownThisVisit: 2, state: buildState() })).toBeNull();
  });
});
