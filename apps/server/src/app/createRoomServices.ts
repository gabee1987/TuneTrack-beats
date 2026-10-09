import type { DeckService } from "../decks/DeckService.js";
import { PlaylistOrchestrator } from "../decks/PlaylistOrchestrator.js";
import type { PlaylistImportService } from "../decks/PlaylistImportService.js";
import { createRoomCore, type RoomCore, type RoomDurations } from "../rooms/createRoomCore.js";
import { SpotifyOrchestrator, type SpotifyServices } from "../spotify/SpotifyOrchestrator.js";
import { env } from "./env.js";

/** Everything the transport edges call; built once at startup and handed to every registrar. */
export interface RoomServices extends RoomCore {
  playlists: PlaylistOrchestrator;
  spotify: SpotifyOrchestrator;
}

export interface RoomServiceDependencies {
  durations: RoomDurations;
  deckService: DeckService;
  playlistImportService: PlaylistImportService;
  spotify: SpotifyServices;
}

export function createRoomServices(dependencies: RoomServiceDependencies): RoomServices {
  const { deckService } = dependencies;
  const core: RoomCore = createRoomCore(dependencies.durations, (roomId) => {
    const importedDeck = core.store.getImportedDeck(roomId);
    return importedDeck
      ? deckService.createShuffledDeckFromCards(importedDeck)
      : deckService.createShuffledDeck();
  });
  const spotify = new SpotifyOrchestrator(core.store, core.lobby, dependencies.spotify);
  spotify.followRoomLifecycle(core.events);

  return {
    ...core,
    playlists: new PlaylistOrchestrator(core.store, core.lobby, dependencies.playlistImportService),
    spotify,
  };
}

export function roomDurationsFromEnv(): RoomDurations {
  return {
    reconnectGracePeriodMs: env.RECONNECT_GRACE_MS,
    hostTransferGracePeriodMs: env.HOST_TRANSFER_GRACE_MS,
    turnSkipGracePeriodMs: env.TURN_SKIP_GRACE_MS,
    allPlayersOfflineRoomTtlMs: env.ALL_PLAYERS_OFFLINE_ROOM_TTL_MS,
    maxActiveRoomCount: env.MAX_ACTIVE_ROOMS,
  };
}
