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
        state: buildState({ seenCounts: { "game-drag-preview": 1 } }),
      }),
    ).toBe("game-confirm");
  });

  it("suppresses every hint while hints are switched off", () => {
    expect(
      selectNextHint({ candidateIds: ["game-menu"], state: buildState({ enabled: false }) }),
    ).toBeNull();
  });
});
