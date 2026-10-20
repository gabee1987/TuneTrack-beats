import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

const ROOM_ID = "TEST_ROOM_1";
const OTHER_ROOM_ID = "TEST_ROOM_2";

describe("SpotifyTokenStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps each room's host tokens to that room", () => {
    const store = new SpotifyTokenStore();
    store.setHostTokens(ROOM_ID, "TEST_ACCESS_1", "TEST_REFRESH_1", 3600, "premium");

    expect(store.getHostTokenRecord(ROOM_ID)).toMatchObject({
      accessToken: "TEST_ACCESS_1",
      refreshToken: "TEST_REFRESH_1",
      accountType: "premium",
    });
    expect(store.getHostTokenRecord(OTHER_ROOM_ID)).toBeNull();
    expect(store.isHostTokenExpired(OTHER_ROOM_ID)).toBe(true);
  });

  it("treats a host token as expired one minute before Spotify does", () => {
    const store = new SpotifyTokenStore();
    store.setHostTokens(ROOM_ID, "TEST_ACCESS_1", "TEST_REFRESH_1", 3600, "free");

    vi.advanceTimersByTime(3540_000 - 1);
    expect(store.isHostTokenExpired(ROOM_ID)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(store.isHostTokenExpired(ROOM_ID)).toBe(true);
  });

  it("renews the access token and its expiry, keeping the refresh token unless rotated", () => {
    const store = new SpotifyTokenStore();
    store.setHostTokens(ROOM_ID, "TEST_ACCESS_1", "TEST_REFRESH_1", 60, "premium");

    store.updateHostAccessToken(ROOM_ID, "TEST_ACCESS_2", 3600);

    expect(store.getHostTokenRecord(ROOM_ID)).toMatchObject({
      accessToken: "TEST_ACCESS_2",
      refreshToken: "TEST_REFRESH_1",
    });
    expect(store.isHostTokenExpired(ROOM_ID)).toBe(false);
  });

  it("does not create a record when renewing a room without one", () => {
    const store = new SpotifyTokenStore();

    store.updateHostAccessToken(ROOM_ID, "TEST_ACCESS_2", 3600, "TEST_REFRESH_2");

    expect(store.getHostTokenRecord(ROOM_ID)).toBeNull();
  });

  it("removes a room's tokens when the room closes, leaving other rooms intact", () => {
    const store = new SpotifyTokenStore();
    store.setHostTokens(ROOM_ID, "TEST_ACCESS_1", "TEST_REFRESH_1", 3600, "premium");
    store.setHostTokens(OTHER_ROOM_ID, "TEST_ACCESS_2", "TEST_REFRESH_2", 3600, "premium");

    store.clearHostTokens(ROOM_ID);

    expect(store.getHostTokenRecord(ROOM_ID)).toBeNull();
    expect(store.getHostTokenRecord(OTHER_ROOM_ID)?.accessToken).toBe("TEST_ACCESS_2");
  });

  it("moves the tokens with a renamed room", () => {
    const store = new SpotifyTokenStore();
    store.setHostTokens(ROOM_ID, "TEST_ACCESS_1", "TEST_REFRESH_1", 3600, "premium");

    store.retargetRoom(ROOM_ID, OTHER_ROOM_ID);
    store.retargetRoom("TEST_ROOM_3", ROOM_ID);

    expect(store.getHostTokenRecord(ROOM_ID)).toBeNull();
    expect(store.getHostTokenRecord(OTHER_ROOM_ID)?.accessToken).toBe("TEST_ACCESS_1");
  });

  it("expires the app token one minute early as well", () => {
    const store = new SpotifyTokenStore();
    expect(store.isClientCredentialsExpired()).toBe(true);

    store.setClientCredentials("TEST_APP_TOKEN", 120);
    expect(store.getClientCredentials()?.token).toBe("TEST_APP_TOKEN");
    expect(store.isClientCredentialsExpired()).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(store.isClientCredentialsExpired()).toBe(true);
  });
});
