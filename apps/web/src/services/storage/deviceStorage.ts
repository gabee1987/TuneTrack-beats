/**
 * Browser storage that never throws. Storage can be missing or throw on every access (private
 * windows, blocked site data, storage-disabled Safari); callers then get `null` and keep their
 * state in memory.
 */
export type DeviceStorageArea = "local" | "session";

function resolveStorage(area: DeviceStorageArea): Storage | null {
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readDeviceStorage(key: string, area: DeviceStorageArea = "local"): string | null {
  try {
    return resolveStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeDeviceStorage(
  key: string,
  value: string,
  area: DeviceStorageArea = "local",
): void {
  try {
    resolveStorage(area)?.setItem(key, value);
  } catch {
    // Quota exceeded or storage blocked: the caller's in-memory value stays authoritative.
  }
}
