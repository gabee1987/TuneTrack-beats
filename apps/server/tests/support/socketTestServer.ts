import type { GameTrackCard } from "@tunetrack/game-engine";
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

export { nextEvent } from "./waiters.js";

/**
 * A real Socket.IO server on a free port with the production handlers, and connected clients.
 * Everything a test opens is closed after it, and the room timers it started are cleared so
 * none fires into a later test.
 */
const sockets: Socket[] = [];
const closers: Array<() => Promise<void>> = [];
const registries: RoomRegistry[] = [];

afterEach(async () => {
  sockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.disconnect();
  });
  sockets.length = 0;
  await Promise.all(closers.map((close) => close()));
  closers.length = 0;
  registries.forEach((registry) => registry.clearAllTimers());
  registries.length = 0;
});

class FixedDeckService extends DeckService {
  public constructor(private readonly deck: readonly GameTrackCard[]) {
    super();
  }

  public override createShuffledDeck(): GameTrackCard[] {
    return this.deck.map((card) => ({ ...card }));
  }
}

export interface TestRoomServiceOptions {
  /** Dealt in this order instead of the shuffled practice deck. */
  deck?: readonly GameTrackCard[];
  reconnectGracePeriodMs?: number;
}

export function createTestRoomService(options: TestRoomServiceOptions = {}): RoomService {
  const tokenStore = new SpotifyTokenStore();
  const apiClient = new SpotifyApiClient();
  const registry = new RoomRegistry(undefined, options.reconnectGracePeriodMs ?? 500, 25, 25);
  registries.push(registry);
  return new RoomService(
    registry,
    options.deck ? new FixedDeckService(options.deck) : new DeckService(),
    new SpotifyAuthService(apiClient, tokenStore),
    new PlaylistImportService(apiClient, tokenStore),
    new SpotifyDiscoveryService(apiClient, tokenStore),
    new SpotifyMusicSearchService(apiClient, tokenStore),
    new SpotifyPlaybackSessionStore(),
  );
}

export async function startSocketTestServer(
  roomService = createTestRoomService(),
): Promise<string> {
  const { httpServer } = createHttpServer();
  const io = createSocketServer(httpServer);
  registerSocketHandlers(io, roomService);
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
