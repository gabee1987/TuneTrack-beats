import { ServerToClientEvent } from "@tunetrack/shared";
import type { Server } from "socket.io";
import { logger } from "../app/logger.js";
import type { RoomServices } from "../app/createRoomServices.js";
import { broadcastRoomDirectory, trackRoomDirectoryWatchers } from "./broadcastRoomDirectory.js";
import { registerGameplayHandlers } from "./handlers/gameplayHandlers.js";
import { registerLobbyHandlers } from "./handlers/lobbyHandlers.js";
import { registerPlaylistHandlers } from "./handlers/playlistHandlers.js";
import { registerSpotifyHandlers } from "./handlers/spotifyHandlers.js";
import { registerSocketRateLimit } from "./rateLimit.js";
import { logRoomStateBroadcast, registerSocketAuditMiddleware } from "./realtimeAuditLogger.js";

export function registerSocketHandlers(io: Server, services: RoomServices): void {
  trackRoomDirectoryWatchers(io);
  services.events.on("roomStateChanged", (roomState) => {
    logRoomStateBroadcast(ServerToClientEvent.StateUpdate, roomState);
    io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
      roomState,
    });
    if (roomState.status === "lobby") {
      broadcastRoomDirectory(io, services);
    }
  });
  services.events.on("roomDirectoryChanged", () => {
    broadcastRoomDirectory(io, services);
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");
    registerSocketAuditMiddleware(socket);
    registerSocketRateLimit(socket);
    registerLobbyHandlers(io, socket, services);
    registerGameplayHandlers(io, socket, services);
    registerPlaylistHandlers(io, socket, services);
    registerSpotifyHandlers(io, socket, services);
  });
}
