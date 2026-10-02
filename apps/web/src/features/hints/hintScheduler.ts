import { hintRegistry } from "./hintRegistry";
import type { HintId, HintState } from "./hintState";

interface SelectNextHintOptions {
  candidateIds: Iterable<HintId>;
  maxHintsPerVisit: number;
  shownThisVisit: number;
  state: HintState;
}

export function selectNextHint({
  candidateIds,
  maxHintsPerVisit,
  shownThisVisit,
  state,
}: SelectNextHintOptions): HintId | null {
  if (!state.enabled || shownThisVisit >= maxHintsPerVisit) {
    return null;
  }

  return (
    Array.from(candidateIds)
      .filter((id) => (state.seenCounts[id] ?? 0) === 0)
      .sort((left, right) => hintRegistry[left].priority - hintRegistry[right].priority)[0] ?? null
  );
}
