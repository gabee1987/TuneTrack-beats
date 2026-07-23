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
import { SpotifyDiscoveryService } from "./spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "./spotify/SpotifyMusicSearchService.js";
import { SpotifyTokenStore } from "./spotify/SpotifyTokenStore.js";
import {
  getConfiguredSpotifyRedirectUris,
  listSuggestedLanSpotifyRedirectUris,
} from "./spotify/spotifyRedirectUri.js";

const { app, httpServer } = createHttpServer();
const io = createSocketServer(httpServer);

const spotifyTokenStore = new SpotifyTokenStore();
const spotifyApiClient = new SpotifyApiClient();
const spotifyAuthService = new SpotifyAuthService(spotifyApiClient, spotifyTokenStore);
const playlistImportService = new PlaylistImportService(spotifyApiClient, spotifyTokenStore);
const spotifyDiscoveryService = new SpotifyDiscoveryService(spotifyApiClient, spotifyTokenStore);
const spotifyMusicSearchService = new SpotifyMusicSearchService(
  spotifyApiClient,
  spotifyTokenStore,
);
const deckService = new DeckService();
const roomRegistry = new RoomRegistry();
const roomService = new RoomService(
  roomRegistry,
  deckService,
  spotifyAuthService,
  playlistImportService,
  spotifyDiscoveryService,
  spotifyMusicSearchService,
);

registerSpotifyRoutes(app, io, spotifyAuthService, roomService);
registerSocketHandlers(io, roomService);

httpServer.listen(env.PORT, () => {
  const axiomConfigured = Boolean(env.AXIOM_TOKEN && env.AXIOM_DATASET);
  const spotifyRedirectUris = getConfiguredSpotifyRedirectUris();
  const suggestedLanRedirectUris = listSuggestedLanSpotifyRedirectUris();

  logger.info(
    {
      port: env.PORT,
      clientOrigin: env.CLIENT_ORIGIN,
      spotifyRedirectUris,
      suggestedLanRedirectUris,
      eventAuditEnabled: env.ENABLE_EVENT_AUDIT,
      axiomConfigured,
      axiomDataset: env.AXIOM_DATASET ?? null,
      axiomDomain: env.AXIOM_DOMAIN,
    },
    "TuneTrack server is running",
  );

  if (!env.ENABLE_EVENT_AUDIT) {
    logger.warn(
      "ENABLE_EVENT_AUDIT is false — Spotify/realtime audit events will not be sent to Axiom. Set ENABLE_EVENT_AUDIT=true in apps/server/.env to enable.",
    );
  } else if (!axiomConfigured) {
    logger.warn(
      "ENABLE_EVENT_AUDIT is true but AXIOM_TOKEN/AXIOM_DATASET are missing — audits go to console only.",
    );
  }

  const missingLanRedirects = suggestedLanRedirectUris.filter(
    (uri) => !spotifyRedirectUris.includes(uri),
  );
  if (missingLanRedirects.length > 0) {
    logger.warn(
      {
        missingLanRedirects,
      },
      "Phone Spotify login needs these Redirect URIs in Spotify Dashboard and SPOTIFY_REDIRECT_URI (Vite HTTPS proxy). 127.0.0.1 only works on this PC.",
    );
  }

  logAuditEvent({
    auditKind: "server",
    action: "server_started",
    outcome: "succeeded",
    meta: {
      axiomConfigured,
      axiomDataset: env.AXIOM_DATASET,
      axiomDomain: env.AXIOM_DOMAIN,
      eventAuditEnabled: env.ENABLE_EVENT_AUDIT,
      logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === "development" ? "debug" : "info"),
      spotifyRedirectUris,
    },
  });
});
