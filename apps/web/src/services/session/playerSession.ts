import { readDeviceStorage, writeDeviceStorage } from "../storage/deviceStorage";
import { createSessionId } from "./sessionId";

const PLAYER_SESSION_ID_STORAGE_KEY = "tunetrack.playerSessionId";

// Keeps the identity stable across pages of this load when storage is unavailable.
let sessionIdForThisPageLoad: string | null = null;

export function getOrCreatePlayerSessionId(): string {
  const sessionId =
    readDeviceStorage(PLAYER_SESSION_ID_STORAGE_KEY, "local") ??
    readDeviceStorage(PLAYER_SESSION_ID_STORAGE_KEY, "session") ??
    sessionIdForThisPageLoad ??
    createSessionId(window.crypto);

  sessionIdForThisPageLoad = sessionId;
  writeDeviceStorage(PLAYER_SESSION_ID_STORAGE_KEY, sessionId, "local");
  writeDeviceStorage(PLAYER_SESSION_ID_STORAGE_KEY, sessionId, "session");

  return sessionId;
}
