import { describe, expect, it, vi } from "vitest";
import type { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
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
