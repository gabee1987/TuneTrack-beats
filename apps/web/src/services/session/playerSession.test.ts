import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
  rememberPlayerDisplayName,
} from "./playerSession";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function stubWindowStorage() {
  const sessionStorage = new MemoryStorage();
  const localStorage = new MemoryStorage();
  const crypto = {
    randomUUID: () => "stable-session-id",
  };

  vi.stubGlobal("window", {
    crypto,
    localStorage,
    sessionStorage,
  });

  return {
    localStorage,
    sessionStorage,
  };
}

describe("playerSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists new player sessions to local and tab storage", () => {
    const { localStorage, sessionStorage } = stubWindowStorage();

    expect(getOrCreatePlayerSessionId()).toBe("stable-session-id");
    expect(localStorage.getItem("tunetrack.playerSessionId")).toBe(
      "stable-session-id",
    );
    expect(sessionStorage.getItem("tunetrack.playerSessionId")).toBe(
      "stable-session-id",
    );
  });

  it("restores player sessions from durable local storage", () => {
    const { localStorage, sessionStorage } = stubWindowStorage();
    localStorage.setItem("tunetrack.playerSessionId", "persisted-session-id");

    expect(getOrCreatePlayerSessionId()).toBe("persisted-session-id");
    expect(sessionStorage.getItem("tunetrack.playerSessionId")).toBe(
      "persisted-session-id",
    );
  });

  it("persists remembered display names across browser restarts", () => {
    const { localStorage, sessionStorage } = stubWindowStorage();

    rememberPlayerDisplayName("DJ Nova");

    expect(localStorage.getItem("tunetrack.playerDisplayName")).toBe("DJ Nova");
    expect(sessionStorage.getItem("tunetrack.playerDisplayName")).toBe("DJ Nova");

    sessionStorage.setItem("tunetrack.playerDisplayName", "");

    expect(getRememberedPlayerDisplayName()).toBe("DJ Nova");
  });
});
