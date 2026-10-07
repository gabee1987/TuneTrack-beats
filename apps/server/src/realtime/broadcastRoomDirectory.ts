import { ServerToClientEvent } from "@tunetrack/shared";
import type { Server } from "socket.io";
import type { RoomService } from "../rooms/RoomService.js";

/** Sockets in no game room watch the directory. The colon cannot occur in a room code. */
export const ROOM_DIRECTORY_WATCHERS = "directory:watchers";

const serversWithPendingBroadcast = new WeakSet<Server>();

/**
 * Keeps `ROOM_DIRECTORY_WATCHERS` equal to "sockets in no game room" through the adapter's
 * own join and leave events, so no handler has to remember it (B-26).
 */
export function trackRoomDirectoryWatchers(io: Server): void {
  const adapter = io.of("/").adapter;

  adapter.on("join-room", (room: string, socketId: string) => {
    if (room !== socketId && room !== ROOM_DIRECTORY_WATCHERS) {
      io.sockets.sockets.get(socketId)?.leave(ROOM_DIRECTORY_WATCHERS);
    }
  });

  adapter.on("leave-room", (room: string, socketId: string) => {
    const socket = io.sockets.sockets.get(socketId);
    if (room === socketId || room === ROOM_DIRECTORY_WATCHERS || !socket?.connected) {
      return;
    }
    if (socket.rooms.size === 1) {
      socket.join(ROOM_DIRECTORY_WATCHERS);
    }
  });

  io.on("connection", (socket) => {
    socket.join(ROOM_DIRECTORY_WATCHERS);
  });
}

/**
 * Sends the room list to every directory watcher once per tick: a lobby join reaches this both
 * from its handler and from the state listener, and used to broadcast twice (B-26).
 */
export function broadcastRoomDirectory(io: Server, roomService: RoomService): void {
  if (serversWithPendingBroadcast.has(io)) {
    return;
  }

  serversWithPendingBroadcast.add(io);
  queueMicrotask(() => {
    serversWithPendingBroadcast.delete(io);
    io.to(ROOM_DIRECTORY_WATCHERS).emit(ServerToClientEvent.RoomList, {
      rooms: roomService.listRooms(),
    });
  });
}
