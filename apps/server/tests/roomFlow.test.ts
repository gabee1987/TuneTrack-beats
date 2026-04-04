import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { afterEach, describe, expect, it } from "vitest";
import { io as createSocketClient, type Socket } from "socket.io-client";
import { createHttpServer } from "../src/app/createHttpServer.js";
import { createSocketServer } from "../src/app/createSocketServer.js";
import { registerSocketHandlers } from "../src/realtime/registerSocketHandlers.js";
import { RoomService } from "../src/rooms/RoomService.js";

interface TestServerContext {
  baseUrl: string;
  close: () => Promise<void>;
}

const sockets: Socket[] = [];
const serverClosers: Array<() => Promise<void>> = [];

afterEach(async () => {
  sockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.disconnect();
  });
  sockets.length = 0;

  await Promise.all(serverClosers.map((closeServer) => closeServer()));
  serverClosers.length = 0;
});

describe("room flow", () => {
  it("lets two clients join one room, updates settings as host, and transfers host on disconnect", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const roomWithTwoPlayersPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.players.length === 2,
    );

    hostSocket.connect();
    guestSocket.connect();

    hostSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "party-room",
      displayName: "Host Player",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "party-room",
      displayName: "Guest Player",
    });

    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
    ]);

    const roomWithTwoPlayers = await roomWithTwoPlayersPromise;

    expect(roomWithTwoPlayers.hostId).toBe(hostIdentity.playerId);
    expect(roomWithTwoPlayers.players).toEqual([
      expect.objectContaining({
        displayName: "Host Player",
        isHost: true,
      }),
      expect.objectContaining({
        displayName: "Guest Player",
        isHost: false,
      }),
    ]);

    const guestErrorPromise = waitForEvent<ServerErrorPayload>(
      guestSocket,
      ServerToClientEvent.Error,
    );

    guestSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "party-room",
      targetTimelineCardCount: 12,
    });

    await expect(guestErrorPromise).resolves.toEqual({
      code: "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS",
      message: "Only the host can change room settings.",
    });

    const updatedRoomPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.targetTimelineCardCount === 12,
    );

    hostSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "party-room",
      targetTimelineCardCount: 12,
    });

    const updatedRoomState = await updatedRoomPromise;
    expect(updatedRoomState.targetTimelineCardCount).toBe(12);

    const hostTransferPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.hostId === guestIdentity.playerId,
    );

    hostSocket.disconnect();

    const roomAfterHostDisconnect = await hostTransferPromise;
    expect(roomAfterHostDisconnect.players).toHaveLength(1);
    expect(roomAfterHostDisconnect.hostId).toBe(guestIdentity.playerId);
    expect(roomAfterHostDisconnect.players[0]).toEqual(
      expect.objectContaining({
        id: guestIdentity.playerId,
        isHost: true,
      }),
    );
  });
});

async function startTestServer(): Promise<TestServerContext> {
  const { httpServer } = createHttpServer();
  const io = createSocketServer(httpServer);

  registerSocketHandlers(io, new RoomService());

  await new Promise<void>((resolve) => {
    httpServer.listen(0, resolve);
  });

  const address = httpServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server to a local port.");
  }

  const close = async () => {
    await new Promise<void>((resolve) => {
      io.close(() => {
        resolve();
      });
    });
  };

  serverClosers.push(close);

  return {
    baseUrl: `http://localhost:${address.port}`,
    close,
  };
}

function createClient(baseUrl: string): Socket {
  const socket = createSocketClient(baseUrl, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });

  sockets.push(socket);

  return socket;
}

function waitForEvent<TPayload>(
  socket: Socket,
  eventName: string,
): Promise<TPayload> {
  return new Promise((resolve) => {
    socket.once(eventName, (payload: TPayload) => {
      resolve(payload);
    });
  });
}

async function waitForStateUpdate(
  socket: Socket,
  isTargetState: (roomState: PublicRoomState) => boolean,
): Promise<PublicRoomState> {
  while (true) {
    const payload = await waitForEvent<StateUpdatePayload>(
      socket,
      ServerToClientEvent.StateUpdate,
    );

    if (isTargetState(payload.roomState)) {
      return payload.roomState;
    }
  }
}
