import { useEffect, useRef } from "react";
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

  useEffect(() => {
    // A reopen while the previous entry is still popping waits for the pop (see below).
    if (isOpen && !hasPushedRef.current && !isReleasingRef.current) {
      pushEntry();
      return;
    }

    if (!isOpen && hasPushedRef.current) {
      hasPushedRef.current = false;

      if (isInLocationRef.current) {
        isReleasingRef.current = true;
        navigate(-1);
      } else {
        onReleasedRef.current?.();
      }
    }
    // `pushEntry` reads the latest location through a ref; only opening and closing matter.
  }, [id, isOpen, navigate]);

  useEffect(() => {
    if (isReleasingRef.current && !isInLocation) {
      isReleasingRef.current = false;
      onReleasedRef.current?.();

      if (isOpenRef.current) {
        pushEntry();
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
