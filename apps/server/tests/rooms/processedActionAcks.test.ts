import { ClientToServerEvent, DomainError, renameRoomPayloadSchema } from "@tunetrack/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { RoomCore } from "../../src/rooms/createRoomCore.js";
import { createTestRoomCore } from "../support/roomCore.js";

const ROOM_ID = "TEST_ROOM_1";
const RENAMED_ROOM_ID = "TEST_ROOM_2";
const REQUEST_ID = "00000000-0000-4000-8000-000000012345";
const HOST = { socketId: "host-socket", sessionId: "host-session" };
const GUEST = { socketId: "guest-socket", sessionId: "guest-session" };

let roomCore: RoomCore;

function createRoomWithGuest(): RoomCore {
  roomCore = createTestRoomCore();
  roomCore.lobby.createRoom(ROOM_ID, "Player One", HOST.socketId, HOST.sessionId);
  roomCore.lobby.addPlayerToRoom(ROOM_ID, "Player Two", GUEST.socketId, GUEST.sessionId);
  return roomCore;
}

describe("processed action acknowledgements", () => {
  afterEach(() => {
    roomCore.timers.clearAll();
  });

  it("never hands one member's acknowledgement to another member reusing its request id", () => {
    const rooms = createRoomWithGuest();
    const event = ClientToServerEvent.SkipTurn;
    rooms.acks.remember(
      { socketId: HOST.socketId, roomId: ROOM_ID, event },
      { ok: true, requestId: REQUEST_ID },
    );

    expect(
      rooms.acks.find({ socketId: GUEST.socketId, roomId: ROOM_ID, event }, REQUEST_ID),
    ).toBeUndefined();
    expect(
      rooms.acks.find({ socketId: HOST.socketId, roomId: ROOM_ID, event }, REQUEST_ID),
    ).toEqual({ ok: true, requestId: REQUEST_ID });
  });

  it("keeps the same request id apart across events", () => {
    const rooms = createRoomWithGuest();
    rooms.acks.remember(
      { socketId: HOST.socketId, roomId: ROOM_ID, event: ClientToServerEvent.SkipTurn },
      { ok: true, requestId: REQUEST_ID },
    );

    expect(
      rooms.acks.find(
        { socketId: HOST.socketId, roomId: ROOM_ID, event: ClientToServerEvent.KickPlayer },
        REQUEST_ID,
      ),
    ).toBeUndefined();
  });

  it("refuses a lookup from a socket outside the room", () => {
    const rooms = createRoomWithGuest();

    expect(() =>
      rooms.acks.find(
        { socketId: "stranger-socket", roomId: ROOM_ID, event: ClientToServerEvent.SkipTurn },
        REQUEST_ID,
      ),
    ).toThrow(DomainError);
  });

  it("replays a rename retried on a new socket after the host reconnects", () => {
    const rooms = createRoomWithGuest();
    const event = ClientToServerEvent.RenameRoom;
    const renamePayload = { roomId: ROOM_ID, nextRoomId: RENAMED_ROOM_ID, requestId: REQUEST_ID };
    rooms.lobby.renameRoom(HOST.socketId, renameRoomPayloadSchema.parse(renamePayload));
    rooms.acks.remember(
      { socketId: HOST.socketId, roomId: ROOM_ID, event },
      { ok: true, requestId: REQUEST_ID },
    );

    rooms.connection.removePlayerBySocketId(HOST.socketId);
    rooms.lobby.addPlayerToRoom(RENAMED_ROOM_ID, "Player One", "host-socket-2", HOST.sessionId);

    expect(
      rooms.acks.find({ socketId: "host-socket-2", roomId: ROOM_ID, event }, REQUEST_ID),
    ).toEqual({ ok: true, requestId: REQUEST_ID });
  });
});
