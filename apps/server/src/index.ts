import { createHttpServer } from "./app/createHttpServer.js";
import { createSocketServer } from "./app/createSocketServer.js";
import { logAuditEvent } from "./app/auditLogger.js";
import { env } from "./app/env.js";
import { logger } from "./app/logger.js";
import { DeckService } from "./decks/DeckService.js";
import { PlaylistImportService } from "./decks/PlaylistImportService.js";
import { registerSpotifyRoutes } from "./http/spotifyRoutes.js";
import { registerSocketHandlers } from "./realtime/registerSocketHandlers.js";
import { RoomRegistry } from "./rooms/RoomRegistry.js";
import { RoomService } from "./rooms/RoomService.js";
import { SpotifyApiClient } from "./spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "./spotify/SpotifyAuthService.js";
import { SpotifyTokenStore } from "./spotify/SpotifyTokenStore.js";

const { app, httpServer } = createHttpServer();
const io = createSocketServer(httpServer);

const spotifyTokenStore = new SpotifyTokenStore();
const spotifyApiClient = new SpotifyApiClient();
const spotifyAuthService = new SpotifyAuthService(spotifyApiClient, spotifyTokenStore);
const playlistImportService = new PlaylistImportService(spotifyApiClient, spotifyTokenStore);
const deckService = new DeckService();
const roomRegistry = new RoomRegistry();
const roomService = new RoomService(
  roomRegistry,
  deckService,
  spotifyAuthService,
  playlistImportService,
);

registerSpotifyRoutes(app, io, spotifyAuthService, roomService);
registerSocketHandlers(io, roomService);

httpServer.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      clientOrigin: env.CLIENT_ORIGIN,
    },
    "TuneTrack server is running",
  );
  logAuditEvent({
    auditKind: "server",
    action: "server_started",
    outcome: "succeeded",
    meta: {
      axiomConfigured: Boolean(env.AXIOM_TOKEN && env.AXIOM_DATASET),
      eventAuditEnabled: env.ENABLE_EVENT_AUDIT,
      logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === "development" ? "debug" : "info"),
    },
  });
});
