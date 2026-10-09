import {
  generateSpotifyCandidatesPayloadSchema,
  getPlaylistTracksPayloadSchema,
  importPlaylistPayloadSchema,
  loadCuratedPlaylistPayloadSchema,
  openSpotifyPlaylistPayloadSchema,
  removePlaylistTracksPayloadSchema,
  searchSpotifyMusicPayloadSchema,
  searchSpotifyPlaylistsPayloadSchema,
  updatePlaylistTrackPayloadSchema,
  useSpotifyCandidatesPayloadSchema,
} from "@tunetrack/shared";
import { describe, expect, it, vi } from "vitest";
import type { RoomServices } from "../../src/app/createRoomServices.js";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import { SpotifyApiClient } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyDiscoveryService } from "../../src/spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";
import { createTestRoomServices } from "../support/roomServices.js";

const TEST_ROOM_ID = "TEST_ROOM_1";
const HOST_SOCKET_ID = "host-socket";
const GUEST_SOCKET_ID = "guest-socket";

const TRACK_IDS = Array.from({ length: 10 }, (_, index) => `track-${index + 1}`);

const curatedTracks = TRACK_IDS.map((id, index) => ({
  id,
  title: `Test Song ${index + 1}`,
  artist: "Test Artist",
  albumTitle: "Test Album",
  releaseYear: 1980 + index,
  metadataStatus: "imported" as const,
}));

function createServicesWithGuest() {
  const tokenStore = new SpotifyTokenStore();
  const apiClient = new SpotifyApiClient();
  const playlistImportService = new PlaylistImportService(apiClient, tokenStore);
  const discoveryService = new SpotifyDiscoveryService(apiClient, tokenStore);
  const musicSearchService = new SpotifyMusicSearchService(apiClient, tokenStore);
  const spotifyWork = [
    vi.spyOn(playlistImportService, "importFromUrl"),
    vi.spyOn(discoveryService, "searchPlaylists"),
    vi.spyOn(discoveryService, "generateCandidates"),
    vi.spyOn(discoveryService, "applyCandidates"),
    vi.spyOn(musicSearchService, "search"),
    vi.spyOn(musicSearchService, "getPlaylistDetail"),
  ];
  for (const spy of spotifyWork) {
    spy.mockImplementation(() => {
      throw new Error("SPOTIFY_WORK_MUST_NOT_RUN");
    });
  }
  const services = createTestRoomServices({
    apiClient,
    tokenStore,
    playlistImportService,
    spotify: { discovery: discoveryService, musicSearch: musicSearchService },
  });
  services.lobby.createRoom(TEST_ROOM_ID, "Player One", HOST_SOCKET_ID, "session-host");
  services.lobby.addPlayerToRoom(TEST_ROOM_ID, "Player Two", GUEST_SOCKET_ID, "session-guest");
  services.playlists.loadCuratedPlaylist(
    loadCuratedPlaylistPayloadSchema.parse({
      roomId: TEST_ROOM_ID,
      tracks: curatedTracks,
      mode: "replace",
    }),
    HOST_SOCKET_ID,
  );
  return { services, spotifyWork };
}

function startGame(services: RoomServices): void {
  services.gameplay.startGame(HOST_SOCKET_ID, { roomId: TEST_ROOM_ID });
}

type PlaylistAction = (services: RoomServices, socketId: string) => unknown;

const musicSetupActions: Record<string, PlaylistAction> = {
  import_playlist: (services, socketId) =>
    services.playlists.importPlaylist(
      importPlaylistPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        playlistUrl: "https://open.spotify.com/playlist/TESTPLAYLIST12345",
      }),
      socketId,
    ),
  load_curated_playlist: (services, socketId) =>
    services.playlists.loadCuratedPlaylist(
      loadCuratedPlaylistPayloadSchema.parse({ roomId: TEST_ROOM_ID, tracks: curatedTracks }),
      socketId,
    ),
  search_spotify_playlists: (services, socketId) =>
    services.spotify.searchSpotifyPlaylists(
      searchSpotifyPlaylistsPayloadSchema.parse({ roomId: TEST_ROOM_ID, query: "test" }),
      socketId,
    ),
  search_spotify_music: (services, socketId) =>
    services.spotify.searchSpotifyMusic(
      searchSpotifyMusicPayloadSchema.parse({ roomId: TEST_ROOM_ID, query: "test" }),
      socketId,
    ),
  open_spotify_playlist: (services, socketId) =>
    services.spotify.openSpotifyPlaylist(
      openSpotifyPlaylistPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        playlistId: "TESTPLAYLIST12345",
        sourceType: "playlist",
      }),
      socketId,
    ),
  generate_spotify_candidates: (services, socketId) =>
    services.spotify.generateSpotifyCandidates(
      generateSpotifyCandidatesPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        source: { type: "playlists", playlistIds: ["TESTPLAYLIST12345"] },
      }),
      socketId,
    ),
  use_spotify_candidates: (services, socketId) =>
    services.spotify.useSpotifyCandidates(
      useSpotifyCandidatesPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        candidateSessionId: "candidate-session-12345",
        trackIds: TRACK_IDS,
      }),
      socketId,
    ),
};

const getPlaylistTracks: PlaylistAction = (services, socketId) =>
  services.playlists.getPlaylistTracks(
    getPlaylistTracksPayloadSchema.parse({ roomId: TEST_ROOM_ID }),
    socketId,
  );

const playlistEditorActions: Record<string, PlaylistAction> = {
  get_playlist_tracks: getPlaylistTracks,
  remove_playlist_tracks: (services, socketId) =>
    services.playlists.removePlaylistTracks(
      removePlaylistTracksPayloadSchema.parse({ roomId: TEST_ROOM_ID, trackIds: ["track-1"] }),
      socketId,
    ),
  update_playlist_track: (services, socketId) =>
    services.playlists.updatePlaylistTrack(
      updatePlaylistTrackPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        trackId: "track-1",
        releaseYear: 1999,
      }),
      socketId,
    ),
};

describe("playlist and music setup authorisation", () => {
  it.each(Object.entries(musicSetupActions))(
    "refuses %s for a guest before any Spotify work",
    (_event, action) => {
      const { services, spotifyWork } = createServicesWithGuest();

      expect(() => action(services, GUEST_SOCKET_ID)).toThrow("ONLY_HOST_CAN_IMPORT_PLAYLIST");
      for (const spy of spotifyWork) {
        expect(spy).not.toHaveBeenCalled();
      }
    },
  );

  it.each(Object.entries(playlistEditorActions))("refuses %s for a guest", (_event, action) => {
    const { services } = createServicesWithGuest();

    expect(() => action(services, GUEST_SOCKET_ID)).toThrow("ONLY_HOST_CAN_EDIT_PLAYLIST");
  });

  it.each(Object.entries({ ...musicSetupActions, ...playlistEditorActions }))(
    "refuses %s for the host once the game has started",
    (_event, action) => {
      const { services, spotifyWork } = createServicesWithGuest();
      startGame(services);

      expect(() => action(services, HOST_SOCKET_ID)).toThrow("GAME_ALREADY_STARTED");
      for (const spy of spotifyWork) {
        expect(spy).not.toHaveBeenCalled();
      }
    },
  );

  it("never returns release years to a guest during a game", () => {
    const { services } = createServicesWithGuest();
    startGame(services);

    expect(() => getPlaylistTracks(services, GUEST_SOCKET_ID)).toThrow(
      "ONLY_HOST_CAN_EDIT_PLAYLIST",
    );
  });

  it("returns the deck to the host in the lobby", () => {
    const { services } = createServicesWithGuest();

    const tracks = services.playlists.getPlaylistTracks(
      getPlaylistTracksPayloadSchema.parse({ roomId: TEST_ROOM_ID }),
      HOST_SOCKET_ID,
    );

    expect(tracks).toHaveLength(TRACK_IDS.length);
  });
});
