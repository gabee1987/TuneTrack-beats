import { describe, expect, it, vi } from "vitest";
import type { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";
import { createTestRoomServices } from "../support/roomServices.js";

const TEST_ROOM_ID = "TEST_ROOM_1";
const HOST_SOCKET_ID = "host-socket";
const GUEST_SOCKET_ID = "guest-socket";
const OUTSIDER_SOCKET_ID = "outsider-socket";

function buildAuthService() {
  const apiClient = {
    buildAuthUrl: vi.fn(
      (state: string) =>
        `https://accounts.example.test/authorize?state=${encodeURIComponent(state)}`,
    ),
    exchangeCodeForTokens: vi.fn(async () => ({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    })),
    getUserProfile: vi.fn(async () => ({ product: "premium" })),
  } as unknown as SpotifyAccountsClient;
  const tokenStore = new SpotifyTokenStore();
  const setHostTokens = vi.spyOn(tokenStore, "setHostTokens");
  const service = new SpotifyAuthService(apiClient, tokenStore);
  return { apiClient, service, setHostTokens };
}

function readStateFromAuthUrl(authUrl: string): string {
  return new URL(authUrl).searchParams.get("state") ?? "";
}

function forgeSelfDescribingState(roomId: string, socketId: string): string {
  return Buffer.from(
    JSON.stringify({ roomId, socketId, redirectUri: "https://127.0.0.1:4173/callback" }),
  ).toString("base64url");
}

const alwaysHost = () => true;

describe("Spotify OAuth state", () => {
  it("rejects a self-made state that the server never issued", async () => {
    const { apiClient, service, setHostTokens } = buildAuthService();

    const result = await service.handleCallback(
      "code-12345",
      forgeSelfDescribingState(TEST_ROOM_ID, OUTSIDER_SOCKET_ID),
      undefined,
      alwaysHost,
    );

    expect(result.authResult.success).toBe(false);
    expect(apiClient.exchangeCodeForTokens).not.toHaveBeenCalled();
    expect(setHostTokens).not.toHaveBeenCalled();
  });

  it("does not expose the room or socket inside the state parameter", () => {
    const { service } = buildAuthService();

    const state = readStateFromAuthUrl(service.buildAuthUrl(TEST_ROOM_ID, HOST_SOCKET_ID));

    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    expect(decoded).not.toContain(TEST_ROOM_ID);
    expect(decoded).not.toContain(HOST_SOCKET_ID);
  });

  it("stores host tokens for an issued state and accepts that state only once", async () => {
    const { service, setHostTokens } = buildAuthService();
    const state = readStateFromAuthUrl(service.buildAuthUrl(TEST_ROOM_ID, HOST_SOCKET_ID));

    const first = await service.handleCallback("code-12345", state, undefined, alwaysHost);
    const replay = await service.handleCallback("code-12345", state, undefined, alwaysHost);

    expect(first).toMatchObject({
      roomId: TEST_ROOM_ID,
      socketId: HOST_SOCKET_ID,
      authResult: { success: true },
    });
    expect(replay.authResult.success).toBe(false);
    expect(setHostTokens).toHaveBeenCalledTimes(1);
  });

  it("rejects an issued state after it expires", async () => {
    vi.useFakeTimers();

    try {
      const { service, setHostTokens } = buildAuthService();
      const state = readStateFromAuthUrl(service.buildAuthUrl(TEST_ROOM_ID, HOST_SOCKET_ID));

      vi.advanceTimersByTime(10 * 60 * 1_000 + 1);
      const result = await service.handleCallback("code-12345", state, undefined, alwaysHost);

      expect(result.authResult.success).toBe(false);
      expect(setHostTokens).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not exchange the code when the requesting socket is no longer the host", async () => {
    const { apiClient, service, setHostTokens } = buildAuthService();
    const state = readStateFromAuthUrl(service.buildAuthUrl(TEST_ROOM_ID, HOST_SOCKET_ID));

    const result = await service.handleCallback("code-12345", state, undefined, () => false);

    expect(result.authResult.success).toBe(false);
    expect(apiClient.exchangeCodeForTokens).not.toHaveBeenCalled();
    expect(setHostTokens).not.toHaveBeenCalled();
  });

  it("does not store tokens when the host changes while the token exchange is in flight", async () => {
    const { service, setHostTokens } = buildAuthService();
    const state = readStateFromAuthUrl(service.buildAuthUrl(TEST_ROOM_ID, HOST_SOCKET_ID));
    const isRoomHostSocket = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);

    const result = await service.handleCallback("code-12345", state, undefined, isRoomHostSocket);

    expect(result.authResult.success).toBe(false);
    expect(setHostTokens).not.toHaveBeenCalled();
  });
});

describe("Spotify auth URL and room close authorisation", () => {
  function createServicesWithGuest() {
    const tokenStore = new SpotifyTokenStore();
    const services = createTestRoomServices({ tokenStore });
    services.lobby.createRoom(TEST_ROOM_ID, "Player One", HOST_SOCKET_ID, "session-host");
    services.lobby.addPlayerToRoom(TEST_ROOM_ID, "Player Two", GUEST_SOCKET_ID, "session-guest");
    return { services, tokenStore };
  }

  it("issues an auth URL to the host", () => {
    const { services } = createServicesWithGuest();

    expect(
      services.spotify.buildSpotifyAuthUrl({ roomId: TEST_ROOM_ID }, HOST_SOCKET_ID),
    ).toContain("state=");
  });

  it("refuses an auth URL to a guest of the room", () => {
    const { services } = createServicesWithGuest();

    expect(() =>
      services.spotify.buildSpotifyAuthUrl({ roomId: TEST_ROOM_ID }, GUEST_SOCKET_ID),
    ).toThrow();
  });

  it("refuses an auth URL to a socket outside the room", () => {
    const { services } = createServicesWithGuest();

    expect(() =>
      services.spotify.buildSpotifyAuthUrl({ roomId: TEST_ROOM_ID }, OUTSIDER_SOCKET_ID),
    ).toThrow();
  });

  it("treats a callback socket as host only while it hosts the room", () => {
    const { services } = createServicesWithGuest();

    expect(services.spotify.isRoomHostSocket(TEST_ROOM_ID, HOST_SOCKET_ID)).toBe(true);
    expect(services.spotify.isRoomHostSocket(TEST_ROOM_ID, GUEST_SOCKET_ID)).toBe(false);
    expect(services.spotify.isRoomHostSocket(TEST_ROOM_ID, OUTSIDER_SOCKET_ID)).toBe(false);
  });

  it("leaves the host tokens intact when a non-host tries to close the room", () => {
    const { services, tokenStore } = createServicesWithGuest();
    tokenStore.setHostTokens(TEST_ROOM_ID, "access-token", "refresh-token", 3600, "premium");

    expect(() => services.lobby.closeRoom(GUEST_SOCKET_ID, { roomId: TEST_ROOM_ID })).toThrow(
      "ONLY_HOST_CAN_CLOSE_ROOM",
    );
    expect(tokenStore.getHostTokenRecord(TEST_ROOM_ID)).not.toBeNull();
  });
});
