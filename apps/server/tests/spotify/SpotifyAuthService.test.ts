import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import type { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import { SpotifyApiError } from "../../src/spotify/spotifyApiTypes.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

const ROOM_ID = "TEST_ROOM_1";

function createTokenStore(): SpotifyTokenStore {
  const tokenStore = new SpotifyTokenStore();
  tokenStore.setHostTokens(ROOM_ID, "TEST_ACCESS_OLD", "TEST_REFRESH_OLD", 3600, "premium");
  return tokenStore;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("SpotifyAuthService host token refresh (B-19)", () => {
  it("keeps a refresh token that Spotify rotated", async () => {
    const tokenStore = createTokenStore();
    const apiClient = {
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: "TEST_ACCESS_NEW",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "TEST_REFRESH_ROTATED",
      }),
    } as unknown as SpotifyAccountsClient;

    await new SpotifyAuthService(apiClient, tokenStore).refreshHostToken(ROOM_ID);

    expect(tokenStore.getHostTokenRecord(ROOM_ID)).toMatchObject({
      accessToken: "TEST_ACCESS_NEW",
      refreshToken: "TEST_REFRESH_ROTATED",
    });
  });

  it("keeps the old refresh token when Spotify sends none", async () => {
    const tokenStore = createTokenStore();
    const apiClient = {
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: "TEST_ACCESS_NEW",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    } as unknown as SpotifyAccountsClient;

    await new SpotifyAuthService(apiClient, tokenStore).refreshHostToken(ROOM_ID);

    expect(tokenStore.getHostTokenRecord(ROOM_ID)?.refreshToken).toBe("TEST_REFRESH_OLD");
  });

  it("shares one Spotify request between concurrent refreshes of a room", async () => {
    const tokenResponse = deferred<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>();
    const apiClient = {
      refreshAccessToken: vi.fn().mockReturnValue(tokenResponse.promise),
    } as unknown as SpotifyAccountsClient;
    const authService = new SpotifyAuthService(apiClient, createTokenStore());

    const first = authService.refreshHostToken(ROOM_ID);
    const second = authService.refreshHostToken(ROOM_ID);
    tokenResponse.resolve({
      access_token: "TEST_ACCESS_NEW",
      token_type: "Bearer",
      expires_in: 3600,
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { success: true, accessToken: "TEST_ACCESS_NEW", expiresInSeconds: 3600 },
      { success: true, accessToken: "TEST_ACCESS_NEW", expiresInSeconds: 3600 },
    ]);
    expect(apiClient.refreshAccessToken).toHaveBeenCalledTimes(1);

    await authService.refreshHostToken(ROOM_ID);
    expect(apiClient.refreshAccessToken).toHaveBeenCalledTimes(2);
  });
});

describe("SpotifyAuthService login callback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function buildLogin(overrides: Partial<Record<keyof SpotifyAccountsClient, unknown>> = {}) {
    const accounts = {
      buildAuthUrl: vi.fn(
        (state: string) => `https://accounts.example.test/authorize?state=${state}`,
      ),
      exchangeCodeForTokens: vi.fn(async () => ({
        access_token: "TEST_ACCESS",
        refresh_token: "TEST_REFRESH",
        token_type: "Bearer",
        expires_in: 3600,
      })),
      getUserProfile: vi.fn(async () => ({ id: "12345", product: "premium" })),
      ...overrides,
    } as unknown as SpotifyAccountsClient;
    const tokenStore = new SpotifyTokenStore();
    const service = new SpotifyAuthService(accounts, tokenStore);
    const authUrl = service.buildAuthUrl(ROOM_ID, "host-socket");
    const state = new URL(authUrl).searchParams.get("state") ?? "";
    const complete = (code: string | undefined, error?: string) =>
      service.handleCallback(code, state, error, () => true);
    return { service, tokenStore, complete };
  }

  it.each([
    ["premium", "premium"],
    ["free", "free"],
    ["open", "free"],
  ])("stores a %s Spotify account as %s", async (product, accountType) => {
    const { complete, tokenStore } = buildLogin({
      getUserProfile: vi.fn(async () => ({ id: "12345", product })),
    });

    const { authResult } = await complete("TEST_CODE");

    expect(authResult).toEqual({
      success: true,
      accessToken: "TEST_ACCESS",
      accountType,
      expiresInSeconds: 3600,
    });
    expect(tokenStore.getHostTokenRecord(ROOM_ID)?.accountType).toBe(accountType);
  });

  it("reports a cancelled login as auth_denied", async () => {
    const { complete } = buildLogin();

    await expect(complete(undefined, "access_denied")).resolves.toMatchObject({
      roomId: ROOM_ID,
      socketId: "host-socket",
      authResult: { success: false, code: "auth_denied", message: "Spotify login was cancelled." },
    });
  });

  it("reports a callback without a code as unknown", async () => {
    const { complete } = buildLogin();

    await expect(complete(undefined)).resolves.toMatchObject({
      authResult: { success: false, code: "unknown" },
    });
  });

  it("refuses a login when Spotify sends no refresh token", async () => {
    const { complete, tokenStore } = buildLogin({
      exchangeCodeForTokens: vi.fn(async () => ({
        access_token: "TEST_ACCESS",
        token_type: "Bearer",
        expires_in: 3600,
      })),
    });

    await expect(complete("TEST_CODE")).resolves.toMatchObject({
      authResult: { success: false, code: "exchange_failed" },
    });
    expect(tokenStore.getHostTokenRecord(ROOM_ID)).toBeNull();
  });

  it("maps a failed code exchange to exchange_failed without upstream detail", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const { complete } = buildLogin({
      exchangeCodeForTokens: vi.fn(async () => {
        throw new SpotifyApiError("api_error", "UPSTREAM_DETAIL", 502);
      }),
    });

    const { authResult } = await complete("TEST_CODE");

    expect(authResult).toEqual({
      success: false,
      code: "exchange_failed",
      message: "Could not complete Spotify login. Please try again.",
    });
  });
});

describe("SpotifyAuthService host token lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function failingRefresh(error: Error) {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const tokenStore = createTokenStore();
    const apiClient = {
      refreshAccessToken: vi.fn().mockRejectedValue(error),
    } as unknown as SpotifyAccountsClient;
    return { tokenStore, service: new SpotifyAuthService(apiClient, tokenStore) };
  }

  it("forgets the room's tokens when Spotify revoked the refresh token", async () => {
    const { tokenStore, service } = failingRefresh(
      new SpotifyApiError("invalid_grant", "UPSTREAM_DETAIL", 400),
    );

    await expect(service.refreshHostToken(ROOM_ID)).resolves.toEqual({
      success: false,
      reason: "invalid_grant",
    });
    expect(tokenStore.getHostTokenRecord(ROOM_ID)).toBeNull();
    expect(service.isRoomSpotifyConnected(ROOM_ID)).toBe(false);
  });

  it("keeps the room's tokens after a transient refresh failure", async () => {
    const { tokenStore, service } = failingRefresh(new Error("NETWORK_DOWN"));

    await expect(service.refreshHostToken(ROOM_ID)).resolves.toEqual({
      success: false,
      reason: "failed",
    });
    expect(tokenStore.getHostTokenRecord(ROOM_ID)).not.toBeNull();
  });

  it("fails a refresh for a room that never connected Spotify", async () => {
    const service = new SpotifyAuthService({} as SpotifyAccountsClient, new SpotifyTokenStore());

    await expect(service.refreshHostToken(ROOM_ID)).resolves.toEqual({
      success: false,
      reason: "failed",
    });
    await expect(service.resolveHostAccessToken(ROOM_ID)).resolves.toBeNull();
  });

  it("uses the stored token while valid and refreshes it once expired", async () => {
    vi.useFakeTimers();
    try {
      const tokenStore = createTokenStore();
      const apiClient = {
        refreshAccessToken: vi.fn().mockResolvedValue({
          access_token: "TEST_ACCESS_NEW",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      } as unknown as SpotifyAccountsClient;
      const service = new SpotifyAuthService(apiClient, tokenStore);

      await expect(service.resolveHostAccessToken(ROOM_ID)).resolves.toBe("TEST_ACCESS_OLD");
      vi.advanceTimersByTime(3600_000);
      expect(service.getValidHostAccessToken(ROOM_ID)).toBeNull();
      await expect(service.resolveHostAccessToken(ROOM_ID)).resolves.toBe("TEST_ACCESS_NEW");
      expect(apiClient.refreshAccessToken).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves tokens with a renamed room and clears them on request", () => {
    const tokenStore = createTokenStore();
    const service = new SpotifyAuthService({} as SpotifyAccountsClient, tokenStore);

    service.retargetRoom(ROOM_ID, "TEST_ROOM_2");
    expect(service.isRoomSpotifyConnected("TEST_ROOM_2")).toBe(true);

    service.clearHostTokens("TEST_ROOM_2");
    expect(service.isRoomSpotifyConnected("TEST_ROOM_2")).toBe(false);
  });
});
