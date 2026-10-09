import type { GameTrackCard } from "@tunetrack/game-engine";
import {
  createRoomServices,
  roomDurationsFromEnv,
  type RoomServices,
} from "../../src/app/createRoomServices.js";
import { DeckService } from "../../src/decks/DeckService.js";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import type { RoomDurations } from "../../src/rooms/createRoomCore.js";
import { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyCandidateGenerator } from "../../src/spotify/SpotifyCandidateGenerator.js";
import { SpotifyCatalogClient } from "../../src/spotify/SpotifyCatalogClient.js";
import { SpotifyClientCredentials } from "../../src/spotify/SpotifyClientCredentials.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import type { SpotifyServices } from "../../src/spotify/SpotifyOrchestrator.js";
import { SpotifyPlaybackController } from "../../src/spotify/SpotifyPlaybackController.js";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyPlayerClient } from "../../src/spotify/SpotifyPlayerClient.js";
import { SpotifyPlaylistSearch } from "../../src/spotify/SpotifyPlaylistSearch.js";
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
  accounts?: SpotifyAccountsClient;
  catalog?: SpotifyCatalogClient;
  tokenStore?: SpotifyTokenStore;
  spotify?: Partial<SpotifyServices>;
  playlistImportService?: PlaylistImportService;
}

/** The production container with the env durations and in-memory Spotify collaborators. */
export function createTestRoomServices(options: TestRoomServicesOptions = {}): RoomServices {
  const accounts = options.accounts ?? new SpotifyAccountsClient();
  const catalog = options.catalog ?? new SpotifyCatalogClient();
  const tokenStore = options.tokenStore ?? new SpotifyTokenStore();
  const clientCredentials = new SpotifyClientCredentials(accounts, tokenStore);
  const auth = options.spotify?.auth ?? new SpotifyAuthService(accounts, tokenStore);
  const playlistSearch = new SpotifyPlaylistSearch(catalog, clientCredentials);
  return createRoomServices({
    durations: { ...roomDurationsFromEnv(), ...options.durations },
    deckService: options.deck ? new FixedDeckService(options.deck) : new DeckService(),
    playlistImportService:
      options.playlistImportService ?? new PlaylistImportService(catalog, clientCredentials),
    spotify: {
      auth,
      candidates: new SpotifyCandidateGenerator(catalog, clientCredentials, playlistSearch),
      musicSearch: new SpotifyMusicSearchService(catalog, clientCredentials),
      playback: new SpotifyPlaybackController(auth, new SpotifyPlayerClient()),
      playbackSessions: new SpotifyPlaybackSessionStore(),
      playlistSearch,
      ...options.spotify,
    },
  });
}
