import { useEffect, useState } from "react";

export const spotifySetupHistoryStateKey = "tunetrackSpotifySetupEntry";
export const playlistEditorHistoryStateKey = "tunetrackPlaylistEditorEntry";
export const playlistTrackHistoryStateKey = "tunetrackPlaylistTrackEntry";

export function isHistoryState(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function useCurrentHistoryState(routerState: unknown): Record<string, unknown> {
  const [currentState, setCurrentState] = useState(() => toHistoryState(routerState));

  useEffect(() => {
    setCurrentState(toHistoryState(routerState));
  }, [routerState]);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      setCurrentState(getHistoryStateFromPopState(event.state));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return currentState;
}

export function getHistoryStateFromPopState(value: unknown): Record<string, unknown> {
  return toHistoryState(getRouterUserState(value));
}

function getRouterUserState(value: unknown): unknown {
  return isHistoryState(value) && "usr" in value ? value["usr"] : value;
}

function toHistoryState(value: unknown): Record<string, unknown> {
  return isHistoryState(value) ? value : {};
}
