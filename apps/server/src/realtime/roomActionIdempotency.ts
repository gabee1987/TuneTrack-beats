import type { ActionAck } from "@tunetrack/shared";
import type { Socket } from "socket.io";
import type { RoomServices } from "../app/createRoomServices.js";

interface RoomActionPayload {
  roomId: string;
  requestId?: string | undefined;
}

export function roomActionIdempotency(services: RoomServices, socket: Socket, event: string) {
  return {
    find: (data: RoomActionPayload): ActionAck | undefined =>
      data.requestId
        ? services.acks.find({ socketId: socket.id, roomId: data.roomId, event }, data.requestId)
        : undefined,
    remember: (data: RoomActionPayload, ack: ActionAck): void => {
      if (data.requestId) {
        services.acks.remember({ socketId: socket.id, roomId: data.roomId, event }, ack);
      }
    },
  };
}
