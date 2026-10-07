import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from "@tunetrack/shared";
import { create } from "zustand";
import {
  type DeviceStorageArea,
  readDeviceStorage,
  writeDeviceStorage,
} from "../../services/storage/deviceStorage";

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

function deviceStorageReader(area: DeviceStorageArea): StorageReader {
  return { getItem: (key) => readDeviceStorage(key, area) };
}

function readInitialPlayerProfile(): PlayerProfile {
  if (typeof window === "undefined") {
    return emptyPlayerProfile;
  }

  const persistentProfile = readPlayerProfile(deviceStorageReader("local"));
  return persistentProfile.hasCompletedSetup
    ? persistentProfile
    : readPlayerProfile(deviceStorageReader("session"));
}

function persistPlayerProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  const serializedProfile = JSON.stringify(profile);
  for (const area of ["local", "session"] as const) {
    writeDeviceStorage(PLAYER_PROFILE_STORAGE_KEY, serializedProfile, area);
    writeDeviceStorage(LEGACY_DISPLAY_NAME_STORAGE_KEY, profile.displayName, area);
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
