import { expect } from "@playwright/test";
import { ClientToServerEvent, type ActionAck } from "@tunetrack/shared/client";
import { io, type Socket } from "socket.io-client";

const BACKEND_URL = "http://127.0.0.1:3101";

/**
 * Waits until the server has closed a room. The browser cannot tell: the room preview only
 * describes lobby rooms. A join is refused with `GAME_ALREADY_STARTED` while an in-game room
 * is alive and with `ROOM_NOT_FOUND` once it is closed, and a refused join changes nothing.
 */
export async function expectRoomClosedOnServer(roomId: string): Promise<void> {
  const socket = io(BACKEND_URL, { transports: ["websocket"] });

  try {
    await expect
      .poll(() => readJoinRefusal(socket, roomId), {
        message: `room ${roomId} should be closed on the server`,
      })
      .toBe("ROOM_NOT_FOUND");
  } finally {
    socket.close();
  }
}

async function readJoinRefusal(socket: Socket, roomId: string): Promise<ActionAck["code"]> {
  const ack = (await socket.timeout(5_000).emitWithAck(ClientToServerEvent.JoinRoom, {
    displayName: "Room Probe",
    roomId,
    sessionId: "E2E_ROOM_PROBE",
  })) as ActionAck;
  return ack.code;
}
