import express from "express";
import request from "supertest";
import type { Server } from "socket.io";
import { ServerToClientEvent, type PublicRoomState } from "@tunetrack/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoomServices } from "../../src/app/createRoomServices.js";
import { logger } from "../../src/app/logger.js";
import { registerSpotifyRoutes } from "../../src/http/spotifyRoutes.js";
import type { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";

interface Emitted {
  target: string;
  event: string;
  payload: unknown;
}

function createApp(
  handleCallback: SpotifyAuthService["handleCallback"],
  spotify: Partial<RoomServices["spotify"]> = {},
) {
  const app = express();
  const emitted: Emitted[] = [];
  const io = {
    to: (target: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ target, event, payload }),
    }),
  } as unknown as Server;
  registerSpotifyRoutes(
    app,
    io,
    { handleCallback } as SpotifyAuthService,
    {
      spotify,
    } as RoomServices,
  );
  return { app, emitted };
}

const LOGIN_SUCCEEDED = {
  roomId: "TEST_ROOM_1",
  socketId: "host-socket",
  authResult: {
    success: true as const,
    accessToken: "TEST_ACCESS",
    accountType: "premium" as const,
    expiresInSeconds: 3600,
  },
};

describe("Spotify OAuth callback route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the login result to the login socket and the new room state to the room", async () => {
    const roomState = { roomId: "TEST_ROOM_1" } as PublicRoomState;
    const updateSpotifyAuthStatus = vi.fn(() => roomState);
    const { app, emitted } = createApp(async () => LOGIN_SUCCEEDED, { updateSpotifyAuthStatus });

    const response = await request(app).get("/api/spotify/callback?code=code-12345&state=state");

    expect(response.status).toBe(200);
    expect(updateSpotifyAuthStatus).toHaveBeenCalledWith(
      "TEST_ROOM_1",
      "host-socket",
      true,
      "premium",
    );
    expect(emitted).toEqual([
      {
        target: "host-socket",
        event: ServerToClientEvent.SpotifyAuthResult,
        payload: LOGIN_SUCCEEDED.authResult,
      },
      { target: "TEST_ROOM_1", event: ServerToClientEvent.StateUpdate, payload: { roomState } },
    ]);
  });

  it("still closes the popup when the room left during the login", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const { app, emitted } = createApp(async () => LOGIN_SUCCEEDED, {
      updateSpotifyAuthStatus: () => {
        throw new Error("ROOM_NOT_FOUND");
      },
    });

    const response = await request(app).get("/api/spotify/callback?code=code-12345&state=state");

    expect(response.status).toBe(200);
    expect(emitted.map((entry) => entry.event)).toEqual([ServerToClientEvent.SpotifyAuthResult]);
  });

  it("passes the query to the auth service and emits nothing without a login socket", async () => {
    const handleCallback = vi.fn(async () => ({
      roomId: null,
      socketId: "",
      authResult: { success: false as const, code: "unknown" as const, message: "Failed." },
    }));
    const { app, emitted } = createApp(handleCallback);

    await request(app).get("/api/spotify/callback?code=code-12345&state=state-12345");

    expect(handleCallback).toHaveBeenCalledWith(
      "code-12345",
      "state-12345",
      undefined,
      expect.any(Function),
    );
    expect(emitted).toEqual([]);
  });

  it("answers with the close-popup page after a completed callback", async () => {
    const { app } = createApp(async () => ({
      roomId: null,
      socketId: "",
      authResult: { success: false, code: "auth_denied", message: "Spotify login was cancelled." },
    }));

    const response = await request(app).get("/api/spotify/callback?error=access_denied");

    expect(response.status).toBe(200);
    expect(response.text).toContain("window.close()");
  });

  it("answers 500 instead of hanging when the callback throws (B-28)", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const { app } = createApp(async () => {
      throw new Error("UPSTREAM_FAILURE");
    });

    const response = await request(app).get("/api/spotify/callback?code=code-12345&state=state");

    expect(response.status).toBe(500);
    expect(response.text).not.toContain("UPSTREAM_FAILURE");
  });
});
