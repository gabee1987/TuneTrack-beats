import { io as createSocketClient, type Socket } from "socket.io-client";
import { afterEach } from "vitest";
import { createHttpServer } from "../../src/app/createHttpServer.js";
import { createSocketServer } from "../../src/app/createSocketServer.js";
import { DeckService } from "../../src/decks/DeckService.js";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import { registerSocketHandlers } from "../../src/realtime/registerSocketHandlers.js";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { RoomService } from "../../src/rooms/RoomService.js";
import { SpotifyApiClient } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyDiscoveryService } from "../../src/spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

/**
 * A real Socket.IO server on a free port with the production handlers, and connected clients.
 * Everything a test opens is closed after it.
 */
const sockets: Socket[] = [];
const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  sockets.forEach((socket) => socket.disconnect());
  sockets.length = 0;
  await Promise.all(closers.map((close) => close()));
  closers.length = 0;
});

function createRoomService(): RoomService {
  const tokenStore = new SpotifyTokenStore();
  const apiClient = new SpotifyApiClient();
  return new RoomService(
    new RoomRegistry(undefined, 500, 25, 25),
    new DeckService(),
    new SpotifyAuthService(apiClient, tokenStore),
    new PlaylistImportService(apiClient, tokenStore),
    new SpotifyDiscoveryService(apiClient, tokenStore),
    new SpotifyMusicSearchService(apiClient, tokenStore),
    new SpotifyPlaybackSessionStore(),
  );
}

export async function startSocketTestServer(): Promise<string> {
  const { httpServer } = createHttpServer();
  const io = createSocketServer(httpServer);
  registerSocketHandlers(io, createRoomService());
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  closers.push(() => new Promise<void>((resolve) => io.close(() => resolve())));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind the test server.");
  }
  return `http://localhost:${address.port}`;
}

export async function connectTestClient(baseUrl: string): Promise<Socket> {
  const socket = createSocketClient(baseUrl, {
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });
  sockets.push(socket);
  await new Promise<void>((resolve) => socket.once("connect", () => resolve()));
  return socket;
}

export function nextEvent<TPayload>(socket: Socket, eventName: string): Promise<TPayload> {
  return new Promise((resolve) => socket.once(eventName, (payload: TPayload) => resolve(payload)));
}
