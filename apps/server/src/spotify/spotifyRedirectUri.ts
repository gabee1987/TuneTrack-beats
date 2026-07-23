import { networkInterfaces } from "node:os";
import { env } from "../app/env.js";

export function parseSpotifyRedirectUris(rawValue: string): string[] {
  const uris = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return [...new Set(uris)];
}

export function getConfiguredSpotifyRedirectUris(): string[] {
  return parseSpotifyRedirectUris(env.SPOTIFY_REDIRECT_URI);
}

export function getPrimarySpotifyRedirectUri(): string {
  const uris = getConfiguredSpotifyRedirectUris();
  const primary = uris[0];
  if (!primary) {
    throw new Error("SPOTIFY_REDIRECT_URI must contain at least one URL");
  }
  return primary;
}

/**
 * Pick the redirect URI that matches the browser origin (via Vite `/api` proxy
 * on LAN phones). Falls back to the first configured URI.
 */
export function resolveSpotifyRedirectUri(clientOrigin: string | undefined): string {
  const allowlist = getConfiguredSpotifyRedirectUris();
  const primary = getPrimarySpotifyRedirectUri();
  if (!clientOrigin) {
    return primary;
  }

  let origin: string;
  try {
    origin = new URL(clientOrigin).origin;
  } catch {
    return primary;
  }

  const candidate = `${origin}/api/spotify/callback`;
  if (allowlist.includes(candidate)) {
    return candidate;
  }

  return primary;
}

export function listSuggestedLanSpotifyRedirectUris(port = 5173): string[] {
  const addresses: string[] = [];

  for (const entries of Object.values(networkInterfaces())) {
    if (!entries) {
      continue;
    }
    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) {
        continue;
      }
      addresses.push(`https://${entry.address}:${port}/api/spotify/callback`);
    }
  }

  return [...new Set(addresses)];
}
