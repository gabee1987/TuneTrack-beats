import type { Express, Request, Response } from "express";
import type { Server } from "socket.io";
import { ServerToClientEvent } from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import type { SpotifyAuthService } from "../spotify/SpotifyAuthService.js";

export function registerSpotifyRoutes(
  app: Express,
  io: Server,
  spotifyAuthService: SpotifyAuthService,
): void {
  app.get("/api/spotify/callback", (req: Request, res: Response) => {
    void handleSpotifyCallback(req, res, io, spotifyAuthService);
  });
}

async function handleSpotifyCallback(
  req: Request,
  res: Response,
  io: Server,
  spotifyAuthService: SpotifyAuthService,
): Promise<void> {
  const code = typeof req.query["code"] === "string" ? req.query["code"] : undefined;
  const state = typeof req.query["state"] === "string" ? req.query["state"] : undefined;
  const error = typeof req.query["error"] === "string" ? req.query["error"] : undefined;

  logger.info({ hasCode: !!code, hasState: !!state, error }, "Spotify OAuth callback received");

  const { authResult, socketId } = await spotifyAuthService.handleCallback(code, state, error);

  if (socketId) {
    io.to(socketId).emit(ServerToClientEvent.SpotifyAuthResult, authResult);
  }

  res.setHeader("Content-Type", "text/html");
  res.send(buildClosePopupHtml());
}

function buildClosePopupHtml(): string {
  return `<!DOCTYPE html>
<html>
  <head><title>Spotify Login</title></head>
  <body>
    <p>You can close this window.</p>
    <script>window.close();</script>
  </body>
</html>`;
}
