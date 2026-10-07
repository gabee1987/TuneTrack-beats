import { ClientToServerEvent, DomainError, renameRoomPayloadSchema } from "@tunetrack/shared";
import { afterEach, describe, expect, it } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";

const ROOM_ID = "TEST_ROOM_1";
const RENAMED_ROOM_ID = "TEST_ROOM_2";
const REQUEST_ID = "00000000-0000-4000-8000-000000012345";
const HOST = { socketId: "host-socket", sessionId: "host-session" };
const GUEST = { socketId: "guest-socket", sessionId: "guest-session" };

let roomRegistry: RoomRegistry;

function createRoomWithGuest(): RoomRegistry {
  roomRegistry = new RoomRegistry();
  roomRegistry.createRoom(ROOM_ID, "Player One", HOST.socketId, HOST.sessionId);
  roomRegistry.addPlayerToRoom(ROOM_ID, "Player Two", GUEST.socketId, GUEST.sessionId);
  return roomRegistry;
}

describe("processed action acknowledgements", () => {
  afterEach(() => {
    roomRegistry.clearAllTimers();
  });

  it("never hands one member's acknowledgement to another member reusing its request id", () => {
    const registry = createRoomWithGuest();
    const event = ClientToServerEvent.SkipTurn;
    registry.rememberProcessedActionAck(
      { socketId: HOST.socketId, roomId: ROOM_ID, event },
      { ok: true, requestId: REQUEST_ID },
    );

    expect(
      registry.getProcessedActionAck(
        { socketId: GUEST.socketId, roomId: ROOM_ID, event },
        REQUEST_ID,
      ),
    ).toBeUndefined();
    expect(
      registry.getProcessedActionAck(
        { socketId: HOST.socketId, roomId: ROOM_ID, event },
        REQUEST_ID,
      ),
    ).toEqual({ ok: true, requestId: REQUEST_ID });
  });

  it("keeps the same request id apart across events", () => {
    const registry = createRoomWithGuest();
    registry.rememberProcessedActionAck(
      { socketId: HOST.socketId, roomId: ROOM_ID, event: ClientToServerEvent.SkipTurn },
      { ok: true, requestId: REQUEST_ID },
    );

    expect(
      registry.getProcessedActionAck(
        { socketId: HOST.socketId, roomId: ROOM_ID, event: ClientToServerEvent.KickPlayer },
        REQUEST_ID,
      ),
    ).toBeUndefined();
  });

  it("refuses a lookup from a socket outside the room", () => {
    const registry = createRoomWithGuest();

    expect(() =>
      registry.getProcessedActionAck(
        { socketId: "stranger-socket", roomId: ROOM_ID, event: ClientToServerEvent.SkipTurn },
        REQUEST_ID,
      ),
    ).toThrow(DomainError);
  });

  it("replays a rename retried on a new socket after the host reconnects", () => {
    const registry = createRoomWithGuest();
    const event = ClientToServerEvent.RenameRoom;
    const renamePayload = { roomId: ROOM_ID, nextRoomId: RENAMED_ROOM_ID, requestId: REQUEST_ID };
    registry.renameRoom(HOST.socketId, renameRoomPayloadSchema.parse(renamePayload));
    registry.rememberProcessedActionAck(
      { socketId: HOST.socketId, roomId: ROOM_ID, event },
      { ok: true, requestId: REQUEST_ID },
    );

    registry.removePlayerBySocketId(HOST.socketId);
    registry.addPlayerToRoom(RENAMED_ROOM_ID, "Player One", "host-socket-2", HOST.sessionId);

    expect(
      registry.getProcessedActionAck(
        { socketId: "host-socket-2", roomId: ROOM_ID, event },
        REQUEST_ID,
      ),
    ).toEqual({ ok: true, requestId: REQUEST_ID });
  });
});
