import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type RoomListPayload,
  type ServerErrorPayload,
} from "@tunetrack/shared";
import { describe, expect, it, vi } from "vitest";
import { createTestRoomCore } from "../support/roomCore.js";
import {
  createRoomAsHost,
  GUEST,
  HOST,
  openTwoPlayerLobby,
  sendTwice,
  expectAppliedOnce,
} from "../support/roomFixtures.js";
import {
  connectTestClient,
  createSocketTestServices,
  startSocketTestServer,
} from "../support/socketTestServer.js";
import { nextEvent, waitForRoomList, waitForStateUpdate } from "../support/waiters.js";

const ONLY_HOST_SETTINGS_ERROR = {
  code: "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS",
  message: "Only the host can change room settings.",
};

describe("lobby directory", () => {
  it("pushes room directory changes only to sockets outside rooms", async () => {
    const baseUrl = await startSocketTestServer();
    const directory = await connectTestClient(baseUrl);
    const createdPromise = waitForRoomList(directory, (payload) => payload.rooms.length === 1);
    const host = await createRoomAsHost(baseUrl, "listed-room");
    const hostRoomLists: RoomListPayload[] = [];
    host.socket.on(ServerToClientEvent.RoomList, (payload: RoomListPayload) => {
      hostRoomLists.push(payload);
    });

    await expect(createdPromise).resolves.toEqual({
      rooms: [{ hostName: "Host Player", playerCount: 1, roomId: "listed-room", status: "lobby" }],
    });

    const startedPromise = waitForRoomList(directory, (payload) => payload.rooms.length === 0);
    host.socket.emit(ClientToServerEvent.StartGame, { roomId: "listed-room" });
    await expect(startedPromise).resolves.toEqual({ rooms: [] });
    expect(hostRoomLists).toEqual([]);

    const closedPromise = nextEvent<RoomListPayload>(directory, ServerToClientEvent.RoomList);
    const hostClosedPromise = nextEvent<RoomListPayload>(host.socket, ServerToClientEvent.RoomList);
    host.socket.emit(ClientToServerEvent.CloseRoom, { roomId: "listed-room" });

    await expect(closedPromise).resolves.toEqual({ rooms: [] });
    await expect(hostClosedPromise).resolves.toEqual({ rooms: [] });
    expect(hostRoomLists).toEqual([{ rooms: [] }]);
  });

  it("pushes a room directory update when an abandoned lobby expires", async () => {
    const baseUrl = await startSocketTestServer(
      createSocketTestServices({ reconnectGracePeriodMs: 25 }),
    );
    const directory = await connectTestClient(baseUrl);
    const createdPromise = waitForRoomList(directory, (payload) => payload.rooms.length === 1);
    const host = await createRoomAsHost(baseUrl, "abandoned");
    await createdPromise;

    const removedPromise = waitForRoomList(directory, (payload) => payload.rooms.length === 0);
    host.socket.disconnect();

    await expect(removedPromise).resolves.toEqual({ rooms: [] });
  });

  it("rejects new room creation once the active room limit is reached", async () => {
    const baseUrl = await startSocketTestServer();
    for (let index = 1; index <= 5; index += 1) {
      const socket = await connectTestClient(baseUrl);
      const identityPromise = nextEvent(socket, ServerToClientEvent.PlayerIdentity);
      socket.emit(ClientToServerEvent.CreateRoom, {
        roomId: `room-${index}`,
        displayName: `Player ${index}`,
        sessionId: `session-${index}`,
      });
      await identityPromise;
    }
    const extra = await connectTestClient(baseUrl);
    const errorPromise = nextEvent<ServerErrorPayload>(extra, ServerToClientEvent.Error);

    extra.emit(ClientToServerEvent.CreateRoom, {
      roomId: "room-6",
      displayName: "Extra Player",
      sessionId: "session-6",
    });

    await expect(errorPromise).resolves.toEqual({
      code: "ROOM_LIMIT_REACHED",
      message: "The room limit has been reached. Close a room before creating a new one.",
    });
  });
});

describe("lobby membership", () => {
  it("creates a room with a server-generated code when the client omits roomId", async () => {
    const host = await connectTestClient(await startSocketTestServer());
    const roomStatePromise = waitForStateUpdate(host, () => true);

    host.emit(ClientToServerEvent.CreateRoom, HOST);

    const roomState = await roomStatePromise;
    expect(roomState.roomId).toMatch(/^[a-z0-9-]{3,12}$/);
    expect(roomState.players).toEqual([
      expect.objectContaining({ displayName: "Host Player", isHost: true }),
    ]);
  });

  it("lists both players with the creator as host", async () => {
    const { host, lobby } = await openTwoPlayerLobby(await startSocketTestServer(), "party-room");

    expect(lobby.hostId).toBe(host.playerId);
    expect(lobby.players).toEqual([
      expect.objectContaining({ displayName: "Host Player", isHost: true }),
      expect.objectContaining({ displayName: "Guest Player", isHost: false }),
    ]);
  });

  it("lets only the host change room settings", async () => {
    const { host, guest } = await openTwoPlayerLobby(await startSocketTestServer(), "party-room");
    const guestErrorPromise = nextEvent<ServerErrorPayload>(
      guest.socket,
      ServerToClientEvent.Error,
    );
    guest.socket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "party-room",
      targetTimelineCardCount: 12,
    });
    await expect(guestErrorPromise).resolves.toEqual(ONLY_HOST_SETTINGS_ERROR);

    const updatedPromise = waitForStateUpdate(
      host.socket,
      (roomState) => roomState.targetTimelineCardCount === 12,
    );
    host.socket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "party-room",
      targetTimelineCardCount: 12,
    });

    await expect(updatedPromise).resolves.toEqual(
      expect.objectContaining({ targetTimelineCardCount: 12 }),
    );
  });

  it("keeps a reconnecting lobby host as host", async () => {
    const { host, guest } = await openTwoPlayerLobby(await startSocketTestServer(), "party-room");
    const disconnectedPromise = waitForStateUpdate(guest.socket, (roomState) =>
      roomState.players.some(
        (player) => player.id === host.playerId && player.connectionStatus === "disconnected",
      ),
    );

    host.socket.disconnect();

    const roomState = await disconnectedPromise;
    expect(roomState.hostId).toBe(host.playerId);
    expect(roomState.players).toEqual([
      expect.objectContaining({
        id: host.playerId,
        connectionStatus: "disconnected",
        isHost: true,
      }),
      expect.objectContaining({ id: guest.playerId, connectionStatus: "connected", isHost: false }),
    ]);
  });
});

describe("lobby rename", () => {
  it("renames a lobby room for all members once when the request is replayed", async () => {
    const services = createSocketTestServices();
    const renameRoomSpy = vi.spyOn(services.lobby, "renameRoom");
    const baseUrl = await startSocketTestServer(services);
    const { host, guest } = await openTwoPlayerLobby(baseUrl, "party-room");
    const isRenamed = (roomState: PublicRoomState) => roomState.roomId === "renamed-room";
    const renamedPromises = [
      waitForStateUpdate(host.socket, isRenamed),
      waitForStateUpdate(guest.socket, isRenamed),
    ];

    const requestId = "00000000-0000-4000-8000-00000000010d";
    const acks = await sendTwice(host.socket, ClientToServerEvent.RenameRoom, {
      roomId: "party-room",
      nextRoomId: "renamed-room",
      requestId,
    });

    const [hostState, guestState] = await Promise.all(renamedPromises);
    expect(hostState?.hostId).toBe(host.playerId);
    expect(guestState?.players.map((player) => player.id)).toContain(guest.playerId);
    expectAppliedOnce(acks, requestId, renameRoomSpy);
  });

  it("restores a reconnect on the old room code into the renamed room", async () => {
    const baseUrl = await startSocketTestServer();
    const { host, guest } = await openTwoPlayerLobby(baseUrl, "party-room");
    const renamedPromise = waitForStateUpdate(
      guest.socket,
      (roomState) => roomState.roomId === "renamed-room",
    );
    host.socket.emit(ClientToServerEvent.RenameRoom, {
      roomId: "party-room",
      nextRoomId: "renamed-room",
    });
    await renamedPromise;
    guest.socket.disconnect();

    const refreshed = await connectTestClient(baseUrl);
    const identityPromise = nextEvent<PlayerIdentityPayload>(
      refreshed,
      ServerToClientEvent.PlayerIdentity,
    );
    const statePromise = waitForStateUpdate(refreshed, (roomState) =>
      roomState.players.some(
        (player) => player.id === guest.playerId && player.connectionStatus === "connected",
      ),
    );
    refreshed.emit(ClientToServerEvent.JoinRoom, { roomId: "party-room", ...GUEST });

    await expect(identityPromise).resolves.toEqual({ playerId: guest.playerId });
    await expect(statePromise).resolves.toEqual(
      expect.objectContaining({ roomId: "renamed-room" }),
    );
  });
});

describe("lobby sessions in the registry", () => {
  it("moves an existing lobby session to a newly requested room when it is not a rename redirect", () => {
    const roomCore = createTestRoomCore();
    const changedRoomStates: PublicRoomState[] = [];
    roomCore.events.on("roomStateChanged", (roomState) => changedRoomStates.push(roomState));
    const hostJoin = roomCore.lobby.createRoom(
      "room-a",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "room-a",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    const moved = roomCore.lobby.createRoom(
      "room-b",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    expect(moved.roomState).toEqual(
      expect.objectContaining({ roomId: "room-b", hostId: moved.playerId }),
    );
    expect(moved.playerId).not.toBe(guestJoin.playerId);
    expect(moved.roomState.players).toHaveLength(1);
    expect(roomCore.store.getRoomStateForMember("host-socket", "room-a").players).toEqual([
      expect.objectContaining({ id: hostJoin.playerId, displayName: "Host Player" }),
    ]);
    expect(changedRoomStates.at(-1)).toEqual(
      expect.objectContaining({
        roomId: "room-a",
        players: [expect.objectContaining({ id: hostJoin.playerId })],
      }),
    );
  });

  it("keeps a reconnected player online when their stale socket later disconnects", () => {
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "reconnect-room",
      "Host Player",
      "host-socket-old",
      "host-session",
    );
    roomCore.lobby.addPlayerToRoom(
      "reconnect-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    roomCore.lobby.addPlayerToRoom(
      "reconnect-room",
      "Host Player",
      "host-socket-new",
      "host-session",
    );

    expect(roomCore.connection.removePlayerBySocketId("host-socket-old")).toBeNull();
    const roomState = roomCore.store.getRoomStateForMember("host-socket-new", "reconnect-room");
    expect(roomState.players.find((player) => player.id === hostJoin.playerId)).toEqual(
      expect.objectContaining({ connectionStatus: "connected", isHost: true }),
    );
  });

  it("still marks a player disconnected when their only socket drops", () => {
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "solo-drop-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "solo-drop-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    const roomState = roomCore.connection.removePlayerBySocketId("guest-socket");

    expect(roomState?.players.find((player) => player.id === guestJoin.playerId)).toEqual(
      expect.objectContaining({ connectionStatus: "disconnected" }),
    );
    expect(roomState?.hostId).toBe(hostJoin.playerId);
  });

  it("defers a Spotify token refresh from a socket that has not rejoined yet", async () => {
    const result = await createSocketTestServices().spotify.refreshSpotifyToken(
      { roomId: "reconnect-room" },
      "socket-without-membership",
    );

    expect(result).toEqual({ status: "deferred" });
  });
});
