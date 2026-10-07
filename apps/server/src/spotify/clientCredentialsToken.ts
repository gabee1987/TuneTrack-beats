import type { SpotifyApiClient } from "./SpotifyApiClient.js";
import type { SpotifyTokenStore } from "./SpotifyTokenStore.js";

const requestsInFlight = new WeakMap<SpotifyTokenStore, Promise<string>>();

/**
 * The app's client-credentials token: the stored one while valid, otherwise one request to
 * Spotify that every concurrent caller shares (B-22). Import, discovery and search used to
 * fetch their own copy at the same moment.
 */
export function getClientCredentialsAccessToken(
  apiClient: SpotifyApiClient,
  tokenStore: SpotifyTokenStore,
): Promise<string> {
  const stored = tokenStore.isClientCredentialsExpired() ? null : tokenStore.getClientCredentials();
  if (stored) return Promise.resolve(stored.token);

  const pending = requestsInFlight.get(tokenStore);
  if (pending) return pending;

  const request = apiClient
    .getClientCredentialsToken()
    .then((tokenResponse) => {
      tokenStore.setClientCredentials(tokenResponse.access_token, tokenResponse.expires_in);
      return tokenResponse.access_token;
    })
    .finally(() => requestsInFlight.delete(tokenStore));
  requestsInFlight.set(tokenStore, request);
  return request;
}
