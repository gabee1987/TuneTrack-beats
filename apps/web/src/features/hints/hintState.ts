export type HintId = "game-timeline-tap";

export interface HintState {
  version: number;
  seenCounts: Partial<Record<HintId, number>>;
}

export const hintStateStorageKey = "tunetrack.hints.v1";
export const hintStateVersion = 1;

const defaultHintState: HintState = {
  version: hintStateVersion,
  seenCounts: {},
};

export function readHintState(storage: Storage = window.localStorage): HintState {
  try {
    const value = storage.getItem(hintStateStorageKey);
    if (!value) {
      return defaultHintState;
    }

    const parsed = JSON.parse(value) as Partial<HintState>;
    if (parsed.version !== hintStateVersion || !isRecord(parsed.seenCounts)) {
      return defaultHintState;
    }

    return {
      version: hintStateVersion,
      seenCounts: parsed.seenCounts,
    };
  } catch {
    return defaultHintState;
  }
}

export function hasSeenHint(id: HintId, storage: Storage = window.localStorage): boolean {
  return (readHintState(storage).seenCounts[id] ?? 0) > 0;
}

export function markHintSeen(id: HintId, storage: Storage = window.localStorage): void {
  const state = readHintState(storage);

  try {
    storage.setItem(
      hintStateStorageKey,
      JSON.stringify({
        version: hintStateVersion,
        seenCounts: {
          ...state.seenCounts,
          [id]: (state.seenCounts[id] ?? 0) + 1,
        },
      } satisfies HintState),
    );
  } catch {
    // Storage can be unavailable in private browsing. The current view still dismisses safely.
  }
}

export function resetHints(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(hintStateStorageKey);
  } catch {
    // An unavailable store already behaves like a reset store.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
