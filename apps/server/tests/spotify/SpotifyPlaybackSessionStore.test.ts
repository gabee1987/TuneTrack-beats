import { describe, expect, it } from "vitest";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";

describe("SpotifyPlaybackSessionStore", () => {
  it("registers and clears devices per room", () => {
    const store = new SpotifyPlaybackSessionStore();
    store.registerDevice("room-1", "socket-a", "device-a");
    expect(store.getRegisteredDevice("room-1")).toEqual({
      deviceId: "device-a",
      socketId: "socket-a",
    });

    store.unregisterDevice("room-1", "socket-b");
    expect(store.getRegisteredDevice("room-1")?.deviceId).toBe("device-a");

    store.unregisterDevice("room-1", "socket-a");
    expect(store.getRegisteredDevice("room-1")).toBeNull();
  });

  it("supersedes older play requests", () => {
    const store = new SpotifyPlaybackSessionStore();
    store.beginPlayRequest("room-1", "req-1");
    expect(store.isActivePlayRequest("room-1", "req-1")).toBe(true);

    store.beginPlayRequest("room-1", "req-2");
    expect(store.isActivePlayRequest("room-1", "req-1")).toBe(false);
    expect(store.isActivePlayRequest("room-1", "req-2")).toBe(true);
  });

  it("beginHandoff clears the registered device and active play request", () => {
    const store = new SpotifyPlaybackSessionStore();
    store.registerDevice("room-1", "socket-a", "device-a");
    store.beginPlayRequest("room-1", "req-1");

    store.beginHandoff("room-1");

    expect(store.getRegisteredDevice("room-1")).toBeNull();
    expect(store.isActivePlayRequest("room-1", "req-1")).toBe(false);
  });
});
