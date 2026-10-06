export type HintId =
  | "profile-name"
  | "lobby-spotify"
  | "lobby-start"
  | "game-drag-preview"
  | "game-confirm"
  | "game-challenge"
  | "game-next-song"
  | "game-timeline-tap"
  | "game-timeline-switch"
  | "game-tokens"
  | "game-menu";

export interface HintState {
  version: number;
  enabled: boolean;
  seenCounts: Partial<Record<HintId, number>>;
}

export const hintStateStorageKey = "tunetrack.hints.v1";
export const hintStateVersion = 1;

const defaultHintState: HintState = {
  version: hintStateVersion,
  enabled: true,
  seenCounts: {},
};

const hintStateChangedEvent = "tunetrack:hints-changed";

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
      enabled: parsed.enabled !== false,
      seenCounts: parsed.seenCounts,
    };
  } catch {
    return defaultHintState;
  }
}

export function hasSeenHint(id: HintId, storage: Storage = window.localStorage): boolean {
  return (readHintState(storage).seenCounts[id] ?? 0) > 0;
}

export function isHintsEnabled(storage: Storage = window.localStorage): boolean {
  return readHintState(storage).enabled;
}

export function markHintSeen(id: HintId, storage: Storage = window.localStorage): void {
  const state = readHintState(storage);

  try {
    storage.setItem(
      hintStateStorageKey,
      JSON.stringify({
        version: hintStateVersion,
        enabled: state.enabled,
        seenCounts: {
          ...state.seenCounts,
          [id]: (state.seenCounts[id] ?? 0) + 1,
        },
      } satisfies HintState),
    );
    notifyHintStateChanged(storage);
  } catch {
    // Storage can be unavailable in private browsing. The current view still dismisses safely.
  }
}

export function setHintsEnabled(enabled: boolean, storage: Storage = window.localStorage): void {
  const state = readHintState(storage);

  try {
    storage.setItem(hintStateStorageKey, JSON.stringify({ ...state, enabled } satisfies HintState));
    notifyHintStateChanged(storage);
  } catch {
    // Blocked storage keeps the safe default: hints enabled for the current view.
  }
}

export function resetHints(storage: Storage = window.localStorage): void {
  const enabled = readHintState(storage).enabled;

  try {
    storage.setItem(
      hintStateStorageKey,
      JSON.stringify({
        version: hintStateVersion,
        enabled,
        seenCounts: {},
      } satisfies HintState),
    );
    notifyHintStateChanged(storage);
  } catch {
    // An unavailable store already behaves like a reset store.
  }
}

export function subscribeHintState(listener: () => void): () => void {
  window.addEventListener(hintStateChangedEvent, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(hintStateChangedEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function notifyHintStateChanged(storage: Storage) {
  if (storage === window.localStorage) {
    window.dispatchEvent(new Event(hintStateChangedEvent));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
