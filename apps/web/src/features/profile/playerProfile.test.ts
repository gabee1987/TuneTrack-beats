import { describe, expect, it } from "vitest";
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
});
