import express from "express";
import request from "supertest";
import type { Server } from "socket.io";
import { describe, expect, it, vi } from "vitest";
import type { RoomServices } from "../../src/app/createRoomServices.js";
import { logger } from "../../src/app/logger.js";
import { registerSpotifyRoutes } from "../../src/http/spotifyRoutes.js";
import type { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";

function createApp(handleCallback: SpotifyAuthService["handleCallback"]) {
  const app = express();
  const io = { to: () => ({ emit: vi.fn() }) } as unknown as Server;
  registerSpotifyRoutes(app, io, { handleCallback } as SpotifyAuthService, {} as RoomServices);
  return app;
}

describe("Spotify OAuth callback route", () => {
  it("answers with the close-popup page after a completed callback", async () => {
    const app = createApp(async () => ({
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
    const app = createApp(async () => {
      throw new Error("UPSTREAM_FAILURE");
    });

    const response = await request(app).get("/api/spotify/callback?code=code-12345&state=state");

    expect(response.status).toBe(500);
    expect(response.text).not.toContain("UPSTREAM_FAILURE");
  });
});
