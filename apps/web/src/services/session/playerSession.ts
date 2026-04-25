import { createSessionId } from "./sessionId";

const PLAYER_SESSION_ID_STORAGE_KEY = "tunetrack.playerSessionId";
const PLAYER_DISPLAY_NAME_STORAGE_KEY = "tunetrack.playerDisplayName";

export function getOrCreatePlayerSessionId(): string {
  const existingPersistentSessionId = window.localStorage.getItem(
    PLAYER_SESSION_ID_STORAGE_KEY,
  );

  if (existingPersistentSessionId) {
    window.sessionStorage.setItem(
      PLAYER_SESSION_ID_STORAGE_KEY,
      existingPersistentSessionId,
    );
    return existingPersistentSessionId;
  }

  const existingTabSessionId = window.sessionStorage.getItem(
    PLAYER_SESSION_ID_STORAGE_KEY,
  );

  if (existingTabSessionId) {
    window.localStorage.setItem(PLAYER_SESSION_ID_STORAGE_KEY, existingTabSessionId);
    return existingTabSessionId;
  }

  const nextSessionId = createSessionId(window.crypto);
  window.sessionStorage.setItem(PLAYER_SESSION_ID_STORAGE_KEY, nextSessionId);
  window.localStorage.setItem(PLAYER_SESSION_ID_STORAGE_KEY, nextSessionId);

  return nextSessionId;
}

export function rememberPlayerDisplayName(displayName: string): void {
  window.sessionStorage.setItem(PLAYER_DISPLAY_NAME_STORAGE_KEY, displayName);
  window.localStorage.setItem(PLAYER_DISPLAY_NAME_STORAGE_KEY, displayName);
}

export function getRememberedPlayerDisplayName(): string {
  const existingPersistentDisplayName = window.localStorage.getItem(
    PLAYER_DISPLAY_NAME_STORAGE_KEY,
  );

  if (existingPersistentDisplayName) {
    window.sessionStorage.setItem(
      PLAYER_DISPLAY_NAME_STORAGE_KEY,
      existingPersistentDisplayName,
    );
    return existingPersistentDisplayName;
  }

  const existingTabDisplayName =
    window.sessionStorage.getItem(PLAYER_DISPLAY_NAME_STORAGE_KEY) ?? "";

  if (existingTabDisplayName) {
    window.localStorage.setItem(
      PLAYER_DISPLAY_NAME_STORAGE_KEY,
      existingTabDisplayName,
    );
  }

  return existingTabDisplayName;
}
