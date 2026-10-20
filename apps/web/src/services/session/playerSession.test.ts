import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThrowingStorage } from "../../test/stubs/storage";

// The module keeps a page-load fallback id, so every case starts from a fresh module.
async function loadPlayerSession() {
  vi.resetModules();
  return import("./playerSession");
}

describe("playerSession", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: () => "stable-session-id" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists new player sessions to local and tab storage", async () => {
    const { getOrCreatePlayerSessionId } = await loadPlayerSession();

    expect(getOrCreatePlayerSessionId()).toBe("stable-session-id");
    expect(window.localStorage.getItem("tunetrack.playerSessionId")).toBe("stable-session-id");
    expect(window.sessionStorage.getItem("tunetrack.playerSessionId")).toBe("stable-session-id");
  });

  it("restores player sessions from durable local storage", async () => {
    window.localStorage.setItem("tunetrack.playerSessionId", "persisted-session-id");
    const { getOrCreatePlayerSessionId } = await loadPlayerSession();

    expect(getOrCreatePlayerSessionId()).toBe("persisted-session-id");
    expect(window.sessionStorage.getItem("tunetrack.playerSessionId")).toBe("persisted-session-id");
  });

  it("backfills durable storage from the tab cache", async () => {
    window.sessionStorage.setItem("tunetrack.playerSessionId", "tab-session-id");
    const { getOrCreatePlayerSessionId } = await loadPlayerSession();

    expect(getOrCreatePlayerSessionId()).toBe("tab-session-id");
    expect(window.localStorage.getItem("tunetrack.playerSessionId")).toBe("tab-session-id");
  });

  it("keeps one session id for the page load when storage throws", async () => {
    useThrowingStorage();
    const { getOrCreatePlayerSessionId } = await loadPlayerSession();

    expect(getOrCreatePlayerSessionId()).toBe("stable-session-id");
    vi.stubGlobal("crypto", { randomUUID: () => "another-session-id" });
    expect(getOrCreatePlayerSessionId()).toBe("stable-session-id");
  });
});
