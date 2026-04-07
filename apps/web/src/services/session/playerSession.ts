const PLAYER_SESSION_ID_STORAGE_KEY = "tunetrack.playerSessionId";
const PLAYER_DISPLAY_NAME_STORAGE_KEY = "tunetrack.playerDisplayName";

export function getOrCreatePlayerSessionId(): string {
  const existingSessionId = window.sessionStorage.getItem(
    PLAYER_SESSION_ID_STORAGE_KEY,
  );

  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = crypto.randomUUID();
  window.sessionStorage.setItem(PLAYER_SESSION_ID_STORAGE_KEY, nextSessionId);

  return nextSessionId;
}

export function rememberPlayerDisplayName(displayName: string): void {
  window.sessionStorage.setItem(PLAYER_DISPLAY_NAME_STORAGE_KEY, displayName);
}

export function getRememberedPlayerDisplayName(): string {
  return window.sessionStorage.getItem(PLAYER_DISPLAY_NAME_STORAGE_KEY) ?? "";
}
