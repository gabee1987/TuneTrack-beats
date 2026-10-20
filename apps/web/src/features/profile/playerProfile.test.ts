import { describe, expect, it, vi } from "vitest";
import { useThrowingStorage } from "../../test/stubs/storage";
import { readPlayerProfile } from "./playerProfile";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("playerProfile", () => {
  it("starts without a completed name", () => {
    expect(readPlayerProfile(new MemoryStorage())).toEqual({
      displayName: "",
      hasCompletedSetup: false,
    });
  });

  it("migrates the existing remembered player name", () => {
    const storage = new MemoryStorage();
    storage.setItem("tunetrack.playerDisplayName", "DJ Nova");

    expect(readPlayerProfile(storage)).toEqual({
      displayName: "DJ Nova",
      hasCompletedSetup: true,
    });
  });

  it("ignores malformed persisted profile data", () => {
    const storage = new MemoryStorage();
    storage.setItem("tunetrack.playerProfile.v1", "not-json");

    expect(readPlayerProfile(storage)).toEqual({
      displayName: "",
      hasCompletedSetup: false,
    });
  });

  it("is the only writer of the legacy display-name key", async () => {
    vi.resetModules();
    const { usePlayerProfileStore } = await import("./playerProfile");

    usePlayerProfileStore.getState().setDisplayName("Player One");

    expect(window.localStorage.getItem("tunetrack.playerDisplayName")).toBe("Player One");
    expect(JSON.parse(window.localStorage.getItem("tunetrack.playerProfile.v1") ?? "{}")).toEqual({
      displayName: "Player One",
      hasCompletedSetup: true,
    });
  });

  it("starts and keeps a name in memory when storage throws", async () => {
    useThrowingStorage();
    vi.resetModules();
    const { usePlayerProfileStore } = await import("./playerProfile");

    expect(usePlayerProfileStore.getState().hasCompletedSetup).toBe(false);
    usePlayerProfileStore.getState().setDisplayName("Player One");
    expect(usePlayerProfileStore.getState().displayName).toBe("Player One");
  });
});
