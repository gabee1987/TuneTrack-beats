import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from "@tunetrack/shared";
import { create } from "zustand";

const PLAYER_PROFILE_STORAGE_KEY = "tunetrack.playerProfile.v1";
const LEGACY_DISPLAY_NAME_STORAGE_KEY = "tunetrack.playerDisplayName";

interface StorageReader {
  getItem(key: string): string | null;
}

export interface PlayerProfile {
  displayName: string;
  hasCompletedSetup: boolean;
}

interface PlayerProfileStore extends PlayerProfile {
  setDisplayName: (displayName: string) => void;
}

const emptyPlayerProfile: PlayerProfile = {
  displayName: "",
  hasCompletedSetup: false,
};

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const displayName = value.trim();
  return displayName.length >= PLAYER_NAME_MIN_LENGTH &&
    displayName.length <= PLAYER_NAME_MAX_LENGTH
    ? displayName
    : "";
}

export function readPlayerProfile(storage: StorageReader): PlayerProfile {
  try {
    const storedProfile = storage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (storedProfile) {
      const parsedProfile = JSON.parse(storedProfile) as {
        displayName?: unknown;
        hasCompletedSetup?: unknown;
      };
      const displayName = normalizeDisplayName(parsedProfile.displayName);
      if (displayName && parsedProfile.hasCompletedSetup === true) {
        return { displayName, hasCompletedSetup: true };
      }
    }

    const migratedDisplayName = normalizeDisplayName(
      storage.getItem(LEGACY_DISPLAY_NAME_STORAGE_KEY),
    );
    return migratedDisplayName
      ? { displayName: migratedDisplayName, hasCompletedSetup: true }
      : emptyPlayerProfile;
  } catch {
    return emptyPlayerProfile;
  }
}

function readInitialPlayerProfile(): PlayerProfile {
  if (typeof window === "undefined") {
    return emptyPlayerProfile;
  }

  try {
    const persistentProfile = readPlayerProfile(window.localStorage);
    return persistentProfile.hasCompletedSetup
      ? persistentProfile
      : readPlayerProfile(window.sessionStorage);
  } catch {
    return emptyPlayerProfile;
  }
}

function persistPlayerProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serializedProfile = JSON.stringify(profile);
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, serializedProfile);
    window.sessionStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, serializedProfile);
    window.localStorage.setItem(LEGACY_DISPLAY_NAME_STORAGE_KEY, profile.displayName);
    window.sessionStorage.setItem(LEGACY_DISPLAY_NAME_STORAGE_KEY, profile.displayName);
  } catch {
    // The in-memory profile remains usable when browser storage is unavailable.
  }
}

const initialPlayerProfile = readInitialPlayerProfile();

export const usePlayerProfileStore = create<PlayerProfileStore>((set) => ({
  ...initialPlayerProfile,
  setDisplayName: (value) => {
    const displayName = normalizeDisplayName(value);
    if (!displayName) {
      return;
    }

    const profile = { displayName, hasCompletedSetup: true };
    persistPlayerProfile(profile);
    set(profile);
  },
}));

export function getPlayerProfile(): PlayerProfile {
  const { displayName, hasCompletedSetup } = usePlayerProfileStore.getState();
  return { displayName, hasCompletedSetup };
}
