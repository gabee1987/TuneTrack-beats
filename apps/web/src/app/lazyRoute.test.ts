import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLazyRoute } from "./lazyRoute";

const CHUNK_RELOAD_STORAGE_KEY = "tunetrack-chunk-reload-attempted";

function chunkError() {
  return new Error("Failed to fetch dynamically imported module: /assets/PlayPage.js");
}

describe("loadLazyRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the loaded module and clears the reload budget", async () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, "true");

    await expect(loadLazyRoute(async () => ({ value: 1 }))).resolves.toEqual({ value: 1 });
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull();
  });

  it("rethrows an error that is not a chunk failure, so the route can report it", async () => {
    const failure = new Error("route module threw");

    await expect(loadLazyRoute(() => Promise.reject(failure))).rejects.toBe(failure);
  });

  /**
   * The reload is the recovery path, but it must not leave the navigation pending
   * forever: an unsettled `lazy()` promise queues every later navigation behind it, which
   * is what made the home screen's Start button look dead until a manual refresh.
   */
  it("rejects once the reload grace elapses instead of hanging forever", async () => {
    const failure = chunkError();
    const pending = loadLazyRoute(() => Promise.reject(failure));
    const assertion = expect(pending).rejects.toBe(failure);

    await vi.advanceTimersByTimeAsync(4_000);
    await assertion;
  });

  it("does not reload twice in one session", async () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, "true");
    const failure = chunkError();

    await expect(loadLazyRoute(() => Promise.reject(failure))).rejects.toBe(failure);
  });
});
