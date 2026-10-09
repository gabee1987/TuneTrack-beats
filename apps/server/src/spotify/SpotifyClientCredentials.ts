import type { SpotifyAccountsClient } from "./SpotifyAccountsClient.js";
import type { SpotifyTokenStore } from "./SpotifyTokenStore.js";

/**
 * The app's client-credentials token: the stored one while valid, otherwise one request to
 * Spotify that every concurrent caller shares (B-22). Import, discovery and search used to
 * fetch their own copy at the same moment.
 */
export class SpotifyClientCredentials {
  private requestInFlight: Promise<string> | null = null;

  public constructor(
    private readonly accounts: SpotifyAccountsClient,
    private readonly tokenStore: SpotifyTokenStore,
  ) {}

  public getAccessToken(): Promise<string> {
    const stored = this.tokenStore.isClientCredentialsExpired()
      ? null
      : this.tokenStore.getClientCredentials();
    if (stored) return Promise.resolve(stored.token);
    if (this.requestInFlight) return this.requestInFlight;

    const request = this.accounts
      .getClientCredentialsToken()
      .then((tokenResponse) => {
        this.tokenStore.setClientCredentials(tokenResponse.access_token, tokenResponse.expires_in);
        return tokenResponse.access_token;
      })
      .finally(() => {
        this.requestInFlight = null;
      });
    this.requestInFlight = request;
    return request;
  }
}
