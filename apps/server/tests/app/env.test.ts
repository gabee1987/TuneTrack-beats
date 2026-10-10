import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `env.ts` validates `process.env` once, at import. Each case sets a clean environment, then
 * imports a fresh copy of the module.
 */
const OPTIONAL_KEYS = [
  "PORT",
  "MAX_ACTIVE_ROOMS",
  "RECONNECT_GRACE_MS",
  "HOST_TRANSFER_GRACE_MS",
  "TURN_SKIP_GRACE_MS",
  "ALL_PLAYERS_OFFLINE_ROOM_TTL_MS",
  "TRUST_PROXY_HOPS",
  "CLIENT_ORIGIN",
  "SPOTIFY_ACCOUNTS_BASE_URL",
  "SPOTIFY_API_BASE_URL",
  "LOG_LEVEL",
  "ENABLE_EVENT_AUDIT",
  "EVENT_AUDIT_INCLUDE_PAYLOADS",
  "TEST_RUN_ID",
  "TEST_DECK_RANDOM_VALUE",
  "AXIOM_TOKEN",
  "AXIOM_DATASET",
  "AXIOM_DOMAIN",
];

async function loadEnv(values: Record<string, string> = {}) {
  for (const key of OPTIONAL_KEYS) vi.stubEnv(key, undefined);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SPOTIFY_CLIENT_ID", "test-client-id");
  vi.stubEnv("SPOTIFY_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:3001/api/spotify/callback");
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);

  vi.resetModules();
  const { env } = await import("../../src/app/env.js");
  return env;
}

describe("server environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("applies the documented defaults", async () => {
    await expect(loadEnv()).resolves.toMatchObject({
      NODE_ENV: "production",
      PORT: 3001,
      MAX_ACTIVE_ROOMS: 5,
      RECONNECT_GRACE_MS: 30_000,
      HOST_TRANSFER_GRACE_MS: 30_000,
      TURN_SKIP_GRACE_MS: 60_000,
      ALL_PLAYERS_OFFLINE_ROOM_TTL_MS: 3_600_000,
      TRUST_PROXY_HOPS: 0,
      CLIENT_ORIGIN: "http://localhost:5173",
      ENABLE_EVENT_AUDIT: false,
      EVENT_AUDIT_INCLUDE_PAYLOADS: false,
    });
  });

  it("coerces numbers, trims Spotify credentials and reads audit flags", async () => {
    await expect(
      loadEnv({
        PORT: "8080",
        TRUST_PROXY_HOPS: "1",
        SPOTIFY_CLIENT_ID: "  test-client-id  ",
        ENABLE_EVENT_AUDIT: "true",
        CLIENT_ORIGIN: "https://YOUR-RAILWAY-DOMAIN.example.test, http://127.0.0.1:5173",
      }),
    ).resolves.toMatchObject({
      PORT: 8080,
      TRUST_PROXY_HOPS: 1,
      SPOTIFY_CLIENT_ID: "test-client-id",
      ENABLE_EVENT_AUDIT: true,
    });
  });

  it.each([
    ["a non-numeric port", { PORT: "http" }, "PORT"],
    ["a zero grace period", { RECONNECT_GRACE_MS: "0" }, "RECONNECT_GRACE_MS"],
    ["four proxy hops", { TRUST_PROXY_HOPS: "4" }, "TRUST_PROXY_HOPS"],
    ["an origin that is not a URL", { CLIENT_ORIGIN: "https://ok.example.test,nope" }, "nope"],
    ["an empty origin list", { CLIENT_ORIGIN: " , " }, "at least one origin"],
    ["an unknown log level", { LOG_LEVEL: "verbose" }, "LOG_LEVEL"],
    ["a non-boolean audit flag", { ENABLE_EVENT_AUDIT: "yes" }, "ENABLE_EVENT_AUDIT"],
  ])("rejects %s", async (_case, values, detail) => {
    await expect(loadEnv(values)).rejects.toThrow(detail);
  });

  it.each([
    ["a blank client id", { SPOTIFY_CLIENT_ID: "   " }],
    ["a redirect list without entries", { SPOTIFY_REDIRECT_URI: " , " }],
    ["a redirect URI that is not a URL", { SPOTIFY_REDIRECT_URI: "callback" }],
  ])("rejects %s with the Spotify setup steps", async (_case, values) => {
    await expect(loadEnv(values)).rejects.toThrow(/Spotify setup:[\s\S]*Checked keys: SPOTIFY_/);
  });

  it.each([
    { SPOTIFY_ACCOUNTS_BASE_URL: "http://127.0.0.1:3102/accounts" },
    { SPOTIFY_API_BASE_URL: "http://127.0.0.1:3102/api" },
    { TEST_DECK_RANDOM_VALUE: "0.5" },
  ])("refuses the test override %o outside NODE_ENV=test", async (values) => {
    await expect(loadEnv(values)).rejects.toThrow("require NODE_ENV=test");
    await expect(loadEnv({ ...values, NODE_ENV: "development" })).rejects.toThrow(
      "require NODE_ENV=test",
    );
    await expect(loadEnv({ ...values, NODE_ENV: "test" })).resolves.toMatchObject({
      NODE_ENV: "test",
    });
  });

  it.each([
    [{ AXIOM_TOKEN: "TEST_AXIOM_TOKEN" }, "AXIOM_DATASET"],
    [{ AXIOM_DATASET: "TEST_DATASET" }, "AXIOM_TOKEN"],
  ])("requires the Axiom token and dataset together (%o)", async (values, missingKey) => {
    await expect(loadEnv(values)).rejects.toThrow(`${missingKey}: AXIOM_TOKEN and AXIOM_DATASET`);
  });

  it("accepts the Axiom token and dataset together", async () => {
    await expect(
      loadEnv({ AXIOM_TOKEN: "TEST_AXIOM_TOKEN", AXIOM_DATASET: "TEST_DATASET" }),
    ).resolves.toMatchObject({ AXIOM_DOMAIN: "https://us-east-1.aws.edge.axiom.co" });
  });
});
