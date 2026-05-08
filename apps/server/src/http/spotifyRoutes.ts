import type { Express, Request, Response } from "express";
import type { Server } from "socket.io";
import { ServerToClientEvent } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import type { RoomService } from "../rooms/RoomService.js";
import type { SpotifyAuthService } from "../spotify/SpotifyAuthService.js";

export function registerSpotifyRoutes(
  app: Express,
  io: Server,
  spotifyAuthService: SpotifyAuthService,
  roomService: RoomService,
): void {
  app.get("/api/spotify/callback", (req: Request, res: Response) => {
    void handleSpotifyCallback(req, res, io, spotifyAuthService, roomService);
  });
}

async function handleSpotifyCallback(
  req: Request,
  res: Response,
  io: Server,
  spotifyAuthService: SpotifyAuthService,
  roomService: RoomService,
): Promise<void> {
  const code = typeof req.query["code"] === "string" ? req.query["code"] : undefined;
  const state = typeof req.query["state"] === "string" ? req.query["state"] : undefined;
  const error = typeof req.query["error"] === "string" ? req.query["error"] : undefined;

  logger.info({ hasCode: !!code, hasState: !!state, error }, "Spotify OAuth callback received");
  logAuditEvent({
    auditKind: "spotify_auth",
    action: "oauth_callback_received",
    outcome: "received",
    code: error,
    meta: {
      hasCode: !!code,
      hasState: !!state,
    },
  });

  const { authResult, roomId, socketId } = await spotifyAuthService.handleCallback(code, state, error);
  logAuditEvent({
    auditKind: "spotify_auth",
    action: "oauth_callback_completed",
    outcome: authResult.success ? "succeeded" : "failed",
    roomId: roomId ?? undefined,
    socketId,
    code: authResult.success ? undefined : authResult.code,
    message: authResult.success ? undefined : authResult.message,
    meta: authResult.success ? { accountType: authResult.accountType } : undefined,
  });

  if (socketId) {
    io.to(socketId).emit(ServerToClientEvent.SpotifyAuthResult, authResult);
  }

  if (authResult.success && roomId && socketId) {
    try {
      const roomState = roomService.updateSpotifyAuthStatus(roomId, socketId, true, authResult.accountType);
      io.to(roomId).emit(ServerToClientEvent.StateUpdate, { roomState });
    } catch {
      logger.warn({ roomId }, "Could not update Spotify auth status in room state");
    }
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
