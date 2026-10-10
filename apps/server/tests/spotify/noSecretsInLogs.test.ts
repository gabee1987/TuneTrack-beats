import express from "express";
import request from "supertest";
import type { Server } from "socket.io";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Tokens, the login code, the OAuth state and the app secret never reach a log line or an
 * audit record (06 T6). The logger is a real pino instance writing to memory, so serialised
 * errors are checked too; the Axiom sink is captured as well. Audit is fully on, payloads
 * included, which is the most revealing configuration.
 */
const captured = vi.hoisted(() => ({ lines: [] as string[] }));

vi.mock("../../src/app/logger.js", async () => {
  const { default: pino } = await import("pino");
  return {
    logger: pino({ level: "trace" }, { write: (line: string) => captured.lines.push(line) }),
  };
});

vi.mock("../../src/app/axiomLogSink.js", () => ({
  enqueueAxiomLogEvent: (event: unknown) => captured.lines.push(JSON.stringify(event)),
}));

process.env["ENABLE_EVENT_AUDIT"] = "true";
process.env["EVENT_AUDIT_INCLUDE_PAYLOADS"] = "true";

const ROOM_ID = "TEST_ROOM_1";
const HOST_SOCKET_ID = "host-socket";
const SECRET = {
  accessToken: "TEST_SECRET_ACCESS_12345",
  refreshToken: "TEST_SECRET_REFRESH_12345",
  rotatedRefreshToken: "TEST_SECRET_ROTATED_12345",
  refreshedAccessToken: "TEST_SECRET_REFRESHED_12345",
  appToken: "TEST_SECRET_APP_12345",
  authCode: "TEST_SECRET_CODE_12345",
};
// Set by vitest.setup.ts; the basic credentials are what the token request sends.
const CLIENT_SECRET = "test-client-secret";
const BASIC_CREDENTIALS = Buffer.from(`test-client-id:${CLIENT_SECRET}`).toString("base64");

const { SpotifyAccountsClient } = await import("../../src/spotify/SpotifyAccountsClient.js");
const { SpotifyAuthService } = await import("../../src/spotify/SpotifyAuthService.js");
const { SpotifyClientCredentials } = await import("../../src/spotify/SpotifyClientCredentials.js");
const { SpotifyTokenStore } = await import("../../src/spotify/SpotifyTokenStore.js");
const { registerSpotifyRoutes } = await import("../../src/http/spotifyRoutes.js");
const { registerSocketAuditMiddleware, logRejectedSocketEvent } =
  await import("../../src/realtime/realtimeAuditLogger.js");
type RoomServices = import("../../src/app/createRoomServices.js").RoomServices;

const ACCOUNTS = "http://127.0.0.1:3102/accounts";
const API = "http://127.0.0.1:3102/api";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** A fake Spotify that answers each grant with secret-shaped tokens. */
function stubSpotify(refreshFails = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === `${API}/me`) return json({ id: "12345", product: "premium" });
      const grant = new URLSearchParams(String(init?.body)).get("grant_type");
      if (grant === "client_credentials") {
        return json({ access_token: SECRET.appToken, token_type: "Bearer", expires_in: 3600 });
      }
      if (grant === "authorization_code") {
        return json({
          access_token: SECRET.accessToken,
          refresh_token: SECRET.refreshToken,
          token_type: "Bearer",
          expires_in: 3600,
        });
      }
      if (refreshFails) return json({ error: "invalid_grant" }, 400);
      return json({
        access_token: SECRET.refreshedAccessToken,
        refresh_token: SECRET.rotatedRefreshToken,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }),
  );
}

function expectNoSecretsLogged(issuedStates: string[]): void {
  const forbidden = [...Object.values(SECRET), CLIENT_SECRET, BASIC_CREDENTIALS, ...issuedStates];
  const logText = captured.lines.join("\n");

  for (const secret of forbidden) {
    expect(logText, `log output contains ${secret}`).not.toContain(secret);
  }
}

function createLogin() {
  const accounts = new SpotifyAccountsClient({ accountsBaseUrl: ACCOUNTS, apiBaseUrl: API });
  const tokenStore = new SpotifyTokenStore();
  const authService = new SpotifyAuthService(accounts, tokenStore);
  const app = express();
  const io = { to: () => ({ emit: () => undefined }) } as unknown as Server;
  registerSpotifyRoutes(app, io, authService, {
    spotify: {
      isRoomHostSocket: () => true,
      updateSpotifyAuthStatus: () => ({ roomId: ROOM_ID }),
    },
  } as unknown as RoomServices);

  const authUrl = authService.buildAuthUrl(ROOM_ID, HOST_SOCKET_ID, "https://127.0.0.1:5173");
  const state = new URL(authUrl).searchParams.get("state") ?? "";
  return { accounts, tokenStore, authService, app, state };
}

describe("no secrets in logs", () => {
  beforeAll(() => {
    captured.lines.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs a full host login and token refresh without a token, code or state", async () => {
    stubSpotify();
    const { app, authService, tokenStore, state } = createLogin();

    const response = await request(app).get(
      `/api/spotify/callback?code=${SECRET.authCode}&state=${state}`,
    );
    await authService.refreshHostToken(ROOM_ID);

    expect(response.status).toBe(200);
    expect(tokenStore.getHostTokenRecord(ROOM_ID)?.refreshToken).toBe(SECRET.rotatedRefreshToken);
    expect(captured.lines.length).toBeGreaterThan(3);
    expectNoSecretsLogged([state]);
  });

  it("logs a revoked refresh and a replayed state without a token", async () => {
    stubSpotify(true);
    const { app, authService, state } = createLogin();
    await request(app).get(`/api/spotify/callback?code=${SECRET.authCode}&state=${state}`);

    const refreshed = await authService.refreshHostToken(ROOM_ID);
    const replay = await request(app).get(
      `/api/spotify/callback?code=${SECRET.authCode}&state=${state}`,
    );

    expect(refreshed).toEqual({ success: false, reason: "invalid_grant" });
    expect(replay.status).toBe(200);
    expectNoSecretsLogged([state]);
  });

  it("fetches the app token without logging it or the client secret", async () => {
    stubSpotify();
    const accounts = new SpotifyAccountsClient({ accountsBaseUrl: ACCOUNTS, apiBaseUrl: API });
    const credentials = new SpotifyClientCredentials(accounts, new SpotifyTokenStore());

    await expect(credentials.getAccessToken()).resolves.toBe(SECRET.appToken);
    expectNoSecretsLogged([]);
  });

  it("redacts token fields from audited socket payloads in both directions", () => {
    const middleware: Array<(packet: unknown[], next: () => void) => void> = [];
    let outgoing: (event: string, payload: unknown) => void = () => undefined;
    const socket = {
      id: HOST_SOCKET_ID,
      use: (fn: (typeof middleware)[number]) => middleware.push(fn),
      onAnyOutgoing: (fn: typeof outgoing) => {
        outgoing = fn;
      },
    };
    registerSocketAuditMiddleware(socket as never);

    for (const fn of middleware) {
      fn(
        ["refresh_spotify_token", { roomId: ROOM_ID, refreshToken: SECRET.refreshToken }],
        () => {},
      );
    }
    logRejectedSocketEvent(
      socket as never,
      "refresh_spotify_token",
      "SPOTIFY_TOKEN_REFRESH_DEFERRED",
    );
    outgoing("spotify_token_refreshed", {
      accessToken: SECRET.refreshedAccessToken,
      expiresInSeconds: 3600,
    });
    outgoing("spotify_auth_result", {
      success: true,
      accessToken: SECRET.accessToken,
      accountType: "premium",
    });

    const audited = captured.lines.filter((line) => line.includes("spotify_token_refreshed"));
    expect(audited.join("\n")).toContain("[redacted]");
    expectNoSecretsLogged([]);
  });
});
