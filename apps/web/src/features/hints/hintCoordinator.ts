import {
  isHintsEnabled,
  markHintSeen,
  readHintState,
  subscribeHintState,
  type HintId,
} from "./hintState";
import { selectNextHint } from "./hintScheduler";

const HINT_DELAY_MS = 1_500;
const MAX_HINTS_PER_VISIT = 2;
const candidateCounts = new Map<HintId, number>();
const listeners = new Set<() => void>();
let activeHintId: HintId | null = null;
let pendingHintId: HintId | null = null;
let pendingTimer: number | null = null;
let unsubscribeHintState: (() => void) | null = null;
let shownThisVisit = 0;

export function registerHintCandidate(id: HintId): () => void {
  if (candidateCounts.size === 0) {
    shownThisVisit = 0;
  }
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

    if (activeHintId === id) {
      activeHintId = null;
      emitChange();
    }
    if (candidateCounts.size === 0) {
      shownThisVisit = 0;
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

export function dismissActiveHint(id: HintId): void {
  if (activeHintId !== id) {
    return;
  }

  activeHintId = null;
  emitChange();
  reconcileHints();
}

function ensureHintStateSubscription() {
  unsubscribeHintState ??= subscribeHintState(reconcileHints);
}

function reconcileHints() {
  if (!isHintsEnabled()) {
    clearPendingHint();
    if (activeHintId !== null) {
      activeHintId = null;
      emitChange();
    }
    return;
  }

  if (shownThisVisit >= MAX_HINTS_PER_VISIT) {
    clearPendingHint();
    return;
  }

  if (activeHintId !== null) {
    if (candidateCounts.has(activeHintId)) {
      return;
    }
    activeHintId = null;
    emitChange();
  }

  const nextHintId = selectNextHint({
    candidateIds: candidateCounts.keys(),
    maxHintsPerVisit: MAX_HINTS_PER_VISIT,
    shownThisVisit,
    state: readHintState(),
  });

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
    const selectedHintId = selectNextHint({
      candidateIds: candidateCounts.keys(),
      maxHintsPerVisit: MAX_HINTS_PER_VISIT,
      shownThisVisit,
      state: readHintState(),
    });
    if (selectedHintId !== nextHintId) {
      reconcileHints();
      return;
    }

    activeHintId = nextHintId;
    shownThisVisit += 1;
    markHintSeen(nextHintId);
    emitChange();
  }, HINT_DELAY_MS);
}

function clearPendingHint() {
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
  }
  pendingTimer = null;
  pendingHintId = null;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}
