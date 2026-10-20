import { describe, expect, it, vi } from "vitest";
import type { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import { SpotifyClientCredentials } from "../../src/spotify/SpotifyClientCredentials.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("client-credentials token (B-22)", () => {
  it("fetches once for concurrent callers and reuses the stored token afterwards", async () => {
    const tokenResponse = deferred<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>();
    const accounts = {
      getClientCredentialsToken: vi.fn().mockReturnValue(tokenResponse.promise),
    } as unknown as SpotifyAccountsClient;
    const credentials = new SpotifyClientCredentials(accounts, new SpotifyTokenStore());

    const callers = [credentials.getAccessToken(), credentials.getAccessToken()];
    tokenResponse.resolve({
      access_token: "TEST_APP_TOKEN",
      token_type: "Bearer",
      expires_in: 3600,
    });

    await expect(Promise.all(callers)).resolves.toEqual(["TEST_APP_TOKEN", "TEST_APP_TOKEN"]);
    await expect(credentials.getAccessToken()).resolves.toBe("TEST_APP_TOKEN");
    expect(accounts.getClientCredentialsToken).toHaveBeenCalledTimes(1);
  });
});
