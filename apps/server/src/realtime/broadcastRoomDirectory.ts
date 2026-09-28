import { ServerToClientEvent } from "@tunetrack/shared";
import type { Server } from "socket.io";
import type { RoomService } from "../rooms/RoomService.js";

export function broadcastRoomDirectory(io: Server, roomService: RoomService): void {
  const payload = { rooms: roomService.listRooms() };

  for (const socket of io.sockets.sockets.values()) {
    if (socket.rooms.size === 1 && socket.rooms.has(socket.id)) {
      socket.emit(ServerToClientEvent.RoomList, payload);
    }
  }
}
