import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ActionAck,
  type ClientToServerEventName,
  type PlayerIdentityPayload,
  type PublicRoomState,
} from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { expect, type MockInstance } from "vitest";
import { connectTestClient } from "./socketTestServer.js";
import { nextEvent, waitForStateUpdate } from "./waiters.js";

export interface Seat {
  socket: Socket;
  playerId: string;
}

export const HOST = { displayName: "Host Player", sessionId: "host-session" } as const;
export const GUEST = { displayName: "Guest Player", sessionId: "guest-session" } as const;

async function enterRoom(
  baseUrl: string,
  event: ClientToServerEventName,
  roomId: string,
  player: { displayName: string; sessionId: string },
): Promise<Seat> {
  const socket = await connectTestClient(baseUrl);
  const identityPromise = nextEvent<PlayerIdentityPayload>(
    socket,
    ServerToClientEvent.PlayerIdentity,
  );
  socket.emit(event, { roomId, ...player });
  const { playerId } = await identityPromise;
  return { socket, playerId };
}

export function createRoomAsHost(baseUrl: string, roomId: string): Promise<Seat> {
  return enterRoom(baseUrl, ClientToServerEvent.CreateRoom, roomId, HOST);
}

export function joinRoomAsGuest(baseUrl: string, roomId: string): Promise<Seat> {
  return enterRoom(baseUrl, ClientToServerEvent.JoinRoom, roomId, GUEST);
}

/** Host then guest; resolves once the guest sees both players in the lobby. */
export async function openTwoPlayerLobby(
  baseUrl: string,
  roomId: string,
): Promise<{ host: Seat; guest: Seat; lobby: PublicRoomState }> {
  const host = await createRoomAsHost(baseUrl, roomId);
  const guestSocket = await connectTestClient(baseUrl);
  const identityPromise = nextEvent<PlayerIdentityPayload>(
    guestSocket,
    ServerToClientEvent.PlayerIdentity,
  );
  const lobbyPromise = waitForStateUpdate(
    guestSocket,
    (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
  );
  guestSocket.emit(ClientToServerEvent.JoinRoom, { roomId, ...GUEST });
  const [{ playerId }, lobby] = await Promise.all([identityPromise, lobbyPromise]);
  return { host, guest: { socket: guestSocket, playerId }, lobby };
}

/** Starts the game from the host and resolves with the first turn as `watcher` sees it. */
export async function startGame(
  host: Socket,
  roomId: string,
  watcher: Socket = host,
): Promise<PublicRoomState> {
  const turnPromise = waitForStateUpdate(
    watcher,
    (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 1,
  );
  host.emit(ClientToServerEvent.StartGame, { roomId });
  return turnPromise;
}

export function emitWithAck(
  socket: Socket,
  event: ClientToServerEventName,
  payload: object,
): Promise<ActionAck> {
  return socket.timeout(1_000).emitWithAck(event, payload) as Promise<ActionAck>;
}

/** Sends one action, then the same `requestId` again, as a client retry would. */
export async function sendTwice(
  socket: Socket,
  event: ClientToServerEventName,
  payload: { roomId: string; requestId: string } & Record<string, unknown>,
): Promise<{ firstAck: ActionAck; replayAck: ActionAck }> {
  const firstAck = await emitWithAck(socket, event, payload);
  const replayAck = await emitWithAck(socket, event, payload);
  return { firstAck, replayAck };
}

export function expectAppliedOnce(
  acks: { firstAck: ActionAck; replayAck: ActionAck },
  requestId: string,
  serviceSpy: MockInstance,
): void {
  expect(acks.firstAck).toEqual({ ok: true, requestId });
  expect(acks.replayAck).toEqual(acks.firstAck);
  expect(serviceSpy).toHaveBeenCalledTimes(1);
}
