import { ServerToClientEvent } from "@tunetrack/shared";
import type { Server } from "socket.io";
import { logger } from "../app/logger.js";
import type { RoomService } from "../rooms/RoomService.js";
import { registerGameplayHandlers } from "./handlers/gameplayHandlers.js";
import { registerLobbyHandlers } from "./handlers/lobbyHandlers.js";
import { registerPlaylistHandlers } from "./handlers/playlistHandlers.js";
import { registerSpotifyHandlers } from "./handlers/spotifyHandlers.js";
import {
  logRoomStateBroadcast,
  registerSocketAuditMiddleware,
} from "./realtimeAuditLogger.js";

export function registerSocketHandlers(io: Server, roomService: RoomService): void {
  roomService.setRoomStateChangedListener((roomState) => {
    logRoomStateBroadcast(ServerToClientEvent.StateUpdate, roomState);
    io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
      roomState,
    });
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");
    registerSocketAuditMiddleware(socket);
    registerLobbyHandlers(io, socket, roomService);
    registerGameplayHandlers(io, socket, roomService);
    registerPlaylistHandlers(io, socket, roomService);
    registerSpotifyHandlers(io, socket, roomService);
  });
}
