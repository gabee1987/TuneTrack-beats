import {
  isHintsEnabled,
  markHintSeen,
  readHintState,
  resetHints,
  setHintsEnabled,
  subscribeHintState,
  type HintId,
} from "./hintState";
import { selectNextHint } from "./hintScheduler";

/**
 * The first-game tutorial (`04` §7.1): every eligible hint in priority order, one at a time,
 * each after a quiet period on arrival and after the previous one is acknowledged.
 */
const HINT_DELAY_MS = 1_500;
const candidateCounts = new Map<HintId, number>();
/**
 * Acknowledged on this screen. Storage records the same, but blocked storage records nothing,
 * and a dismissed hint must not come straight back while its moment lasts.
 */
const acknowledgedIds = new Set<HintId>();
const listeners = new Set<() => void>();
let activeHintId: HintId | null = null;
let pendingHintId: HintId | null = null;
let pendingTimer: number | null = null;
let unsubscribeHintState: (() => void) | null = null;
let pauseCount = 0;

export function registerHintCandidate(id: HintId): () => void {
  candidateCounts.set(id, (candidateCounts.get(id) ?? 0) + 1);
  ensureHintStateSubscription();
  reconcileHints();

  return () => {
    const count = candidateCounts.get(id) ?? 0;
    if (count <= 1) {
      candidateCounts.delete(id);
    } else {
      candidateCounts.set(id, count - 1);
    }
    if (candidateCounts.size === 0) {
      acknowledgedIds.clear();
    }
    reconcileHints();
  };
}

export function subscribeActiveHint(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveHintId(): HintId | null {
  return activeHintId;
}

/** The player dismissed the hint or used its control: only now does it count as seen. */
export function acknowledgeHint(id: HintId): void {
  if (activeHintId !== id) {
    return;
  }

  acknowledgedIds.add(id);
  setActiveHint(null);
  markHintSeen(id);
  reconcileHints();
}

/** No hint appears while this holds, for example during a drag. Returns the release. */
export function pauseHints(): () => void {
  pauseCount += 1;
  reconcileHints();

  return () => {
    pauseCount -= 1;
    reconcileHints();
  };
}

/** "Show hints again": the tutorial restarts on the current screen, without a reload. */
export function showHintsAgain(): void {
  acknowledgedIds.clear();
  clearPendingHint();
  setActiveHint(null);
  resetHints();
  setHintsEnabled(true);
  reconcileHints();
}

function ensureHintStateSubscription() {
  unsubscribeHintState ??= subscribeHintState(reconcileHints);
}

function selectCandidate(): HintId | null {
  return selectNextHint({
    candidateIds: [...candidateCounts.keys()].filter((id) => !acknowledgedIds.has(id)),
    state: readHintState(),
  });
}

function reconcileHints() {
  if (!isHintsEnabled() || pauseCount > 0) {
    clearPendingHint();
    setActiveHint(null);
    return;
  }

  if (activeHintId !== null) {
    if (candidateCounts.has(activeHintId)) {
      return;
    }
    // Its moment passed before it was acknowledged: it returns at the next one.
    setActiveHint(null);
  }

  const nextHintId = selectCandidate();
  if (!nextHintId) {
    clearPendingHint();
    return;
  }
  if (pendingHintId === nextHintId) {
    return;
  }

  clearPendingHint();
  pendingHintId = nextHintId;
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    pendingHintId = null;
    if (selectCandidate() !== nextHintId) {
      reconcileHints();
      return;
    }

    setActiveHint(nextHintId);
  }, HINT_DELAY_MS);
}

function setActiveHint(id: HintId | null) {
  if (activeHintId === id) {
    return;
  }
  activeHintId = id;
  listeners.forEach((listener) => listener());
}

function clearPendingHint() {
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
  }
  pendingTimer = null;
  pendingHintId = null;
}
