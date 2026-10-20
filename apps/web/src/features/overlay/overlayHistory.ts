import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

export const overlayHistoryStateKey = "tunetrackOverlayEntries";

export function readOverlayHistoryIds(state: unknown): string[] {
  if (typeof state !== "object" || state === null) {
    return [];
  }

  const ids = (state as Record<string, unknown>)[overlayHistoryStateKey];
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

/** React Router keeps the state passed to `navigate` under `usr` in the browser entry. */
function isInCurrentBrowserEntry(id: string): boolean {
  const browserState: unknown = window.history.state;
  const userState =
    typeof browserState === "object" && browserState !== null && "usr" in browserState
      ? browserState.usr
      : null;

  return readOverlayHistoryIds(userState).includes(id);
}

/**
 * Pops still on their way. The browser queues Back but applies a push at once, so a push made
 * while a pop is pending lands first and the pop then takes the new entry instead: one overlay
 * closing as another opens (Options → Delete) would strand both. Pushes wait for the pops.
 */
let pendingPopCount = 0;
const pushesWaitingForPops = new Set<() => void>();

function finishPop() {
  pendingPopCount -= 1;
  if (pendingPopCount > 0) return;
  const waiting = [...pushesWaitingForPops];
  pushesWaitingForPops.clear();
  waiting.forEach((push) => push());
}

/**
 * Gives an open overlay one same-path history entry (decision log 2026-10-06): Back pops the
 * entry and calls `onBack` without leaving the page, and every other close path (button,
 * scrim, Escape, unmount) pops the entry it pushed, so both paths end in one state.
 * `onReleased` runs once the entry is gone, so a follow-up navigation is not undone by the pop.
 *
 * Returns whether the overlay may show: only once its entry is in the rendered location.
 * Shown any earlier, a Back pressed before the push lands would leave the page instead.
 */
export function useOverlayHistoryEntry(
  id: string,
  isOpen: boolean,
  onBack: () => void,
  onReleased?: () => void,
): boolean {
  const location = useLocation();
  const navigate = useNavigate();
  const isInLocation = readOverlayHistoryIds(location.state).includes(id);
  const locationRef = useRef<Location>(location);
  locationRef.current = location;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const isInLocationRef = useRef(isInLocation);
  isInLocationRef.current = isInLocation;
  const hasPushedRef = useRef(false);
  const hasSeenEntryRef = useRef(false);
  const isReleasingRef = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const onReleasedRef = useRef(onReleased);
  onReleasedRef.current = onReleased;

  function pushWhenPopsLand() {
    if (pendingPopCount > 0) pushesWaitingForPops.add(pushIfStillWanted);
    else pushEntry();
  }

  function pushIfStillWanted() {
    if (isOpenRef.current && !hasPushedRef.current && !isReleasingRef.current) pushEntry();
  }

  function pushEntry() {
    const { hash, pathname, search, state } = locationRef.current;
    const currentState = typeof state === "object" && state !== null ? state : {};
    hasPushedRef.current = true;
    hasSeenEntryRef.current = false;
    navigate(
      { hash, pathname, search },
      {
        state: {
          ...currentState,
          [overlayHistoryStateKey]: [...readOverlayHistoryIds(state), id],
        },
      },
    );
  }

  // Closing starts its pop in the layout phase, which runs before any overlay's open in the
  // same commit, so that open sees the pop pending and waits for it.
  useLayoutEffect(() => {
    if (!isOpen && hasPushedRef.current) {
      hasPushedRef.current = false;

      if (isInLocationRef.current) {
        isReleasingRef.current = true;
        pendingPopCount += 1;
        navigate(-1);
      } else {
        onReleasedRef.current?.();
      }
    }
  }, [isOpen, navigate]);

  useEffect(() => {
    // A reopen while the previous entry is still popping waits for the pop (see below).
    if (isOpen && !hasPushedRef.current && !isReleasingRef.current) {
      pushWhenPopsLand();
    }
    // The push reads the latest location through a ref; only opening matters.
  }, [id, isOpen, navigate]);

  useEffect(() => {
    if (isReleasingRef.current && !isInLocation) {
      isReleasingRef.current = false;
      onReleasedRef.current?.();
      finishPop();

      if (isOpenRef.current) {
        pushWhenPopsLand();
      }
      return;
    }

    if (!hasPushedRef.current) {
      return;
    }

    if (isInLocation) {
      hasSeenEntryRef.current = true;
      return;
    }

    if (hasSeenEntryRef.current) {
      hasPushedRef.current = false;
      hasSeenEntryRef.current = false;
      onBackRef.current();
      onReleasedRef.current?.();
    }
    // Reacts to the entry entering or leaving the location only.
  }, [isInLocation]);

  // On unmount the rendered location may be stale (the route may already have changed), so
  // only the browser entry tells whether this overlay still owns the current entry.
  useEffect(
    () => () => {
      // A push still waiting from an earlier render must not land for an overlay that is gone.
      isOpenRef.current = false;
      // Gone before its pop landed: the pop still lands, and then the waiting pushes may go.
      if (isReleasingRef.current) {
        window.addEventListener("popstate", finishPop, { once: true });
      }
      if (hasPushedRef.current && isInCurrentBrowserEntry(id)) {
        hasPushedRef.current = false;
        navigate(-1);
      }
    },
    [id, navigate],
  );

  // Every change of the releasing flag comes with a location change, so this render sees it.
  return isInLocation && !isReleasingRef.current;
}
