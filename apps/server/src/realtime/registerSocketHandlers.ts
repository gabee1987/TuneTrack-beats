import {
  ClientToServerEvent,
  ServerToClientEvent,
  joinRoomPayloadSchema,
  updatePlayerSettingsPayloadSchema,
  updateRoomSettingsPayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../app/logger.js";
import type { RoomService } from "../rooms/RoomService.js";

export function registerSocketHandlers(io: Server, roomService: RoomService): void {
  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");
    registerJoinRoomHandler(io, socket, roomService);
    registerUpdateRoomSettingsHandler(io, socket, roomService);
    registerUpdatePlayerSettingsHandler(io, socket, roomService);
    registerDisconnectHandler(io, socket, roomService);
  });
}

function registerJoinRoomHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.JoinRoom, (payload: unknown) => {
    const parseResult = joinRoomPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_JOIN_ROOM_PAYLOAD",
        message: "Room code or display name is invalid.",
      });
      return;
    }

    const { playerId, roomState } = roomService.joinRoom(
      parseResult.data,
      socket.id,
    );
    socket.join(roomState.roomId);
    socket.emit(ServerToClientEvent.PlayerIdentity, { playerId });

    io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
      roomState,
    });
  });
}

function registerUpdatePlayerSettingsHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.UpdatePlayerSettings, (payload: unknown) => {
    const parseResult = updatePlayerSettingsPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_PLAYER_SETTINGS_PAYLOAD",
        message: "Player starting-card count is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.updatePlayerSettings(
        parseResult.data,
        socket.id,
      );

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      socket.emit(ServerToClientEvent.Error, {
        code:
          error instanceof Error
            ? error.message
            : "PLAYER_SETTINGS_UPDATE_FAILED",
        message:
          error instanceof Error &&
          error.message === "ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS"
            ? "Only the host can change player settings."
            : "Player settings could not be updated.",
      });
    }
  });
}

function registerUpdateRoomSettingsHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.UpdateRoomSettings, (payload: unknown) => {
    const parseResult = updateRoomSettingsPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_ROOM_SETTINGS_PAYLOAD",
        message: "Target card count must stay within the allowed range.",
      });
      return;
    }

    try {
      const roomState = roomService.updateRoomSettings(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      socket.emit(ServerToClientEvent.Error, {
        code:
          error instanceof Error
            ? error.message
            : "ROOM_SETTINGS_UPDATE_FAILED",
        message:
          error instanceof Error &&
          error.message === "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS"
            ? "Only the host can change room settings."
            : "Room settings could not be updated.",
      });
    }
  });
}

function registerDisconnectHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "socket disconnected");

    const roomState = roomService.removePlayer(socket.id);

    if (roomState) {
      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    }
  });
}
