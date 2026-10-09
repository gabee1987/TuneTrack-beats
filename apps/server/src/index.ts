import { createHttpServer } from "./app/createHttpServer.js";
import { createRoomServices, roomDurationsFromEnv } from "./app/createRoomServices.js";
import { createSocketServer } from "./app/createSocketServer.js";
import { logAuditEvent } from "./app/auditLogger.js";
import { drainAxiomLogEvents } from "./app/axiomLogSink.js";
import { env } from "./app/env.js";
import { logger } from "./app/logger.js";
import { registerProcessFatalHandlers } from "./app/processFatalHandlers.js";
import { registerGracefulShutdown } from "./app/shutdown.js";
import { DeckService } from "./decks/DeckService.js";
import { PlaylistImportService } from "./decks/PlaylistImportService.js";
import { registerSpotifyRoutes } from "./http/spotifyRoutes.js";
import { registerSocketHandlers } from "./realtime/registerSocketHandlers.js";
import { SpotifyAccountsClient } from "./spotify/SpotifyAccountsClient.js";
import { SpotifyAuthService } from "./spotify/SpotifyAuthService.js";
import { SpotifyCandidateGenerator } from "./spotify/SpotifyCandidateGenerator.js";
import { SpotifyCatalogClient } from "./spotify/SpotifyCatalogClient.js";
import { SpotifyClientCredentials } from "./spotify/SpotifyClientCredentials.js";
import { SpotifyMusicSearchService } from "./spotify/SpotifyMusicSearchService.js";
import { SpotifyPlaybackController } from "./spotify/SpotifyPlaybackController.js";
import { SpotifyPlaybackSessionStore } from "./spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyPlayerClient } from "./spotify/SpotifyPlayerClient.js";
import { SpotifyPlaylistSearch } from "./spotify/SpotifyPlaylistSearch.js";
import { SpotifyTokenStore } from "./spotify/SpotifyTokenStore.js";
import {
  getConfiguredSpotifyRedirectUris,
  listSuggestedLanSpotifyRedirectUris,
} from "./spotify/spotifyRedirectUri.js";

registerProcessFatalHandlers(process, logger, (code) => process.exit(code));

const { app, httpServer } = createHttpServer();
const io = createSocketServer(httpServer);

const spotifyClientOptions = {
  ...(env.SPOTIFY_ACCOUNTS_BASE_URL ? { accountsBaseUrl: env.SPOTIFY_ACCOUNTS_BASE_URL } : {}),
  ...(env.SPOTIFY_API_BASE_URL ? { apiBaseUrl: env.SPOTIFY_API_BASE_URL } : {}),
};
const spotifyTokenStore = new SpotifyTokenStore();
const spotifyAccounts = new SpotifyAccountsClient(spotifyClientOptions);
const spotifyCatalog = new SpotifyCatalogClient(spotifyClientOptions);
const spotifyClientCredentials = new SpotifyClientCredentials(spotifyAccounts, spotifyTokenStore);
const spotifyAuthService = new SpotifyAuthService(spotifyAccounts, spotifyTokenStore);
const spotifyPlaylistSearch = new SpotifyPlaylistSearch(spotifyCatalog, spotifyClientCredentials);
const playlistImportService = new PlaylistImportService(spotifyCatalog, spotifyClientCredentials);
const testDeckRandomValue = env.TEST_DECK_RANDOM_VALUE;
const deckService = new DeckService(
  undefined,
  testDeckRandomValue === undefined ? undefined : () => testDeckRandomValue,
);
const roomServices = createRoomServices({
  durations: roomDurationsFromEnv(),
  deckService,
  playlistImportService,
  spotify: {
    auth: spotifyAuthService,
    candidates: new SpotifyCandidateGenerator(
      spotifyCatalog,
      spotifyClientCredentials,
      spotifyPlaylistSearch,
    ),
    musicSearch: new SpotifyMusicSearchService(spotifyCatalog, spotifyClientCredentials),
    playback: new SpotifyPlaybackController(
      spotifyAuthService,
      new SpotifyPlayerClient(spotifyClientOptions),
    ),
    playbackSessions: new SpotifyPlaybackSessionStore(),
    playlistSearch: spotifyPlaylistSearch,
  },
});

registerSpotifyRoutes(app, io, spotifyAuthService, roomServices);
registerSocketHandlers(io, roomServices);
registerGracefulShutdown(process, {
  socketServer: io,
  clearRoomTimers: () => roomServices.timers.clearAll(),
  recordServerStopped: (signal) =>
    logAuditEvent({
      auditKind: "server",
      action: "server_stopped",
      outcome: "succeeded",
      meta: { signal },
    }),
  flushAuditLog: drainAxiomLogEvents,
  log: logger,
  exit: (code) => process.exit(code),
});

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
