import {
  ClientToServerEvent,
  ServerToClientEvent,
  joinRoomPayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../app/logger.js";
import type { RoomService } from "../rooms/RoomService.js";

export function registerSocketHandlers(io: Server, roomService: RoomService): void {
  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");
    registerJoinRoomHandler(io, socket, roomService);
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

    const roomState = roomService.joinRoom(parseResult.data, socket.id);
    socket.join(roomState.roomId);

    io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
      roomState,
    });
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
