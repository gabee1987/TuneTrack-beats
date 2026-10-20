import { ClientToServerEvent, ServerToClientEvent, type RoomListPayload } from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { describe, expect, it } from "vitest";
import {
  connectTestClient as connect,
  nextEvent,
  startSocketTestServer as startServer,
} from "../support/socketTestServer.js";

function nextRoomList(socket: Socket): Promise<RoomListPayload> {
  return nextEvent<RoomListPayload>(socket, ServerToClientEvent.RoomList);
}

function roundTrip(socket: Socket): Promise<void> {
  // Server events to one socket keep their order, so everything sent before the preview reply
  // has arrived once it does.
  const replyPromise = new Promise<void>((resolve) =>
    socket.once(ServerToClientEvent.RoomPreview, () => resolve()),
  );
  socket.emit(ClientToServerEvent.GetRoomPreview, { roomId: "TEST_ROOM_1" });
  return replyPromise;
}

describe("room directory broadcast (B-26)", () => {
  it("sends one room list when a lobby player moves to a new room", async () => {
    const baseUrl = await startServer();
    const watcher = await connect(baseUrl);
    const host = await connect(baseUrl);
    const guest = await connect(baseUrl);

    const listedPromise = nextRoomList(watcher);
    host.emit(ClientToServerEvent.CreateRoom, {
      roomId: "TEST_ROOM_1",
      displayName: "Player One",
      sessionId: "host-session",
    });
    await listedPromise;
    guest.emit(ClientToServerEvent.JoinRoom, {
      roomId: "TEST_ROOM_1",
      displayName: "Player Two",
      sessionId: "guest-session",
    });
    await new Promise<void>((resolve) =>
      guest.once(ServerToClientEvent.StateUpdate, () => resolve()),
    );
    await roundTrip(watcher);

    const listsAfterMove: RoomListPayload[] = [];
    watcher.on(ServerToClientEvent.RoomList, (payload: RoomListPayload) =>
      listsAfterMove.push(payload),
    );
    // Leaving TEST_ROOM_1 fires the room-state listener and the create handler broadcasts too.
    guest.emit(ClientToServerEvent.CreateRoom, {
      roomId: "TEST_ROOM_2",
      displayName: "Player Two",
      sessionId: "guest-session",
    });
    await new Promise<void>((resolve) =>
      guest.once(ServerToClientEvent.StateUpdate, () => resolve()),
    );
    await roundTrip(watcher);

    expect(listsAfterMove).toHaveLength(1);
    expect(listsAfterMove[0]?.rooms.map((room) => room.roomId).sort()).toEqual([
      "TEST_ROOM_1",
      "TEST_ROOM_2",
    ]);
  });

  it("stops sending the room list to a socket that joins a room and resumes when it leaves", async () => {
    const baseUrl = await startServer();
    const host = await connect(baseUrl);
    const lists: RoomListPayload[] = [];
    host.on(ServerToClientEvent.RoomList, (payload: RoomListPayload) => lists.push(payload));

    host.emit(ClientToServerEvent.CreateRoom, {
      roomId: "TEST_ROOM_1",
      displayName: "Player One",
      sessionId: "host-session",
    });
    await new Promise<void>((resolve) =>
      host.once(ServerToClientEvent.StateUpdate, () => resolve()),
    );
    await roundTrip(host);
    expect(lists).toEqual([]);

    const closedListPromise = nextRoomList(host);
    host.emit(ClientToServerEvent.CloseRoom, { roomId: "TEST_ROOM_1" });

    await expect(closedListPromise).resolves.toEqual({ rooms: [] });
  });
});
