import type { ActionAck } from "@tunetrack/shared";
import type { Socket } from "socket.io";
import type { RoomService } from "../rooms/RoomService.js";

interface RoomActionPayload {
  roomId: string;
  requestId?: string | undefined;
}

export function roomActionIdempotency(roomService: RoomService, socket: Socket, event: string) {
  return {
    find: (data: RoomActionPayload): ActionAck | undefined =>
      data.requestId
        ? roomService.getProcessedActionAck(
            { socketId: socket.id, roomId: data.roomId, event },
            data.requestId,
          )
        : undefined,
    remember: (data: RoomActionPayload, ack: ActionAck): void => {
      if (data.requestId) {
        roomService.rememberProcessedActionAck(
          { socketId: socket.id, roomId: data.roomId, event },
          ack,
        );
      }
    },
  };
}
