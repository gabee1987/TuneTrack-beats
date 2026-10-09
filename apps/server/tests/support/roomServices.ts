import type { GameTrackCard } from "@tunetrack/game-engine";
import {
  createRoomServices,
  roomDurationsFromEnv,
  type RoomServices,
} from "../../src/app/createRoomServices.js";
import { DeckService } from "../../src/decks/DeckService.js";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import type { RoomDurations } from "../../src/rooms/createRoomCore.js";
import { SpotifyApiClient } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyDiscoveryService } from "../../src/spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import type { SpotifyServices } from "../../src/spotify/SpotifyOrchestrator.js";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

class FixedDeckService extends DeckService {
  public constructor(private readonly deck: readonly GameTrackCard[]) {
    super();
  }

  public override createShuffledDeck(): GameTrackCard[] {
    return this.deck.map((card) => ({ ...card }));
  }
}

export interface TestRoomServicesOptions {
  /** Dealt in this order instead of the shuffled practice deck. */
  deck?: readonly GameTrackCard[];
  durations?: Partial<RoomDurations>;
  apiClient?: SpotifyApiClient;
  tokenStore?: SpotifyTokenStore;
  spotify?: Partial<SpotifyServices>;
  playlistImportService?: PlaylistImportService;
}

/** The production container with the env durations and in-memory Spotify collaborators. */
export function createTestRoomServices(options: TestRoomServicesOptions = {}): RoomServices {
  const apiClient = options.apiClient ?? new SpotifyApiClient();
  const tokenStore = options.tokenStore ?? new SpotifyTokenStore();
  return createRoomServices({
    durations: { ...roomDurationsFromEnv(), ...options.durations },
    deckService: options.deck ? new FixedDeckService(options.deck) : new DeckService(),
    playlistImportService:
      options.playlistImportService ?? new PlaylistImportService(apiClient, tokenStore),
    spotify: {
      auth: new SpotifyAuthService(apiClient, tokenStore),
      discovery: new SpotifyDiscoveryService(apiClient, tokenStore),
      musicSearch: new SpotifyMusicSearchService(apiClient, tokenStore),
      playbackSessions: new SpotifyPlaybackSessionStore(),
      ...options.spotify,
    },
  });
}
