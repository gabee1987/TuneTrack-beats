import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
 * entry and dismisses the overlay without leaving the page, and every other close path
 * (button, scrim, Escape, unmount) pops the entry it pushed, so both paths end in one state.
 */
export function useOverlayHistoryEntry(id: string, isOpen: boolean, onDismiss: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const isInLocation = readOverlayHistoryIds(location.state).includes(id);
  const isInLocationRef = useRef(isInLocation);
  isInLocationRef.current = isInLocation;
  const hasPushedRef = useRef(false);
  const hasSeenEntryRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (isOpen && !hasPushedRef.current) {
      hasPushedRef.current = true;
      hasSeenEntryRef.current = false;
      const state: unknown = location.state;
      const currentState = typeof state === "object" && state !== null ? state : {};
      navigate(
        { hash: location.hash, pathname: location.pathname, search: location.search },
        {
          state: {
            ...currentState,
            [overlayHistoryStateKey]: [...readOverlayHistoryIds(state), id],
          },
        },
      );
      return;
    }

    if (!isOpen && hasPushedRef.current) {
      hasPushedRef.current = false;

      if (isInLocationRef.current) {
        navigate(-1);
      }
    }
    // The entry is pushed from the location at open time only; later renders must not re-push.
  }, [id, isOpen, navigate]);

  useEffect(() => {
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
      onDismissRef.current();
    }
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
}
