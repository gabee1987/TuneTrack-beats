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
import { DeckService } from "../../src/decks/DeckService.js";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { RoomService } from "../../src/rooms/RoomService.js";
import { SpotifyApiClient } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyDiscoveryService } from "../../src/spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

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

function createRoomServiceWithGuest() {
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
  const roomService = new RoomService(
    new RoomRegistry(),
    new DeckService(),
    new SpotifyAuthService(apiClient, tokenStore),
    playlistImportService,
    discoveryService,
    musicSearchService,
    new SpotifyPlaybackSessionStore(),
  );
  roomService.createRoom(
    { roomId: TEST_ROOM_ID, displayName: "Player One", sessionId: "session-host" },
    HOST_SOCKET_ID,
  );
  roomService.joinRoom(
    { roomId: TEST_ROOM_ID, displayName: "Player Two", sessionId: "session-guest" },
    GUEST_SOCKET_ID,
  );
  roomService.loadCuratedPlaylist(
    loadCuratedPlaylistPayloadSchema.parse({
      roomId: TEST_ROOM_ID,
      tracks: curatedTracks,
      mode: "replace",
    }),
    HOST_SOCKET_ID,
  );
  return { roomService, spotifyWork };
}

function startGame(roomService: RoomService): void {
  roomService.startGame({ roomId: TEST_ROOM_ID }, HOST_SOCKET_ID);
}

type PlaylistAction = (roomService: RoomService, socketId: string) => unknown;

const musicSetupActions: Record<string, PlaylistAction> = {
  import_playlist: (roomService, socketId) =>
    roomService.importPlaylist(
      importPlaylistPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        playlistUrl: "https://open.spotify.com/playlist/TESTPLAYLIST12345",
      }),
      socketId,
    ),
  load_curated_playlist: (roomService, socketId) =>
    roomService.loadCuratedPlaylist(
      loadCuratedPlaylistPayloadSchema.parse({ roomId: TEST_ROOM_ID, tracks: curatedTracks }),
      socketId,
    ),
  search_spotify_playlists: (roomService, socketId) =>
    roomService.searchSpotifyPlaylists(
      searchSpotifyPlaylistsPayloadSchema.parse({ roomId: TEST_ROOM_ID, query: "test" }),
      socketId,
    ),
  search_spotify_music: (roomService, socketId) =>
    roomService.searchSpotifyMusic(
      searchSpotifyMusicPayloadSchema.parse({ roomId: TEST_ROOM_ID, query: "test" }),
      socketId,
    ),
  open_spotify_playlist: (roomService, socketId) =>
    roomService.openSpotifyPlaylist(
      openSpotifyPlaylistPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        playlistId: "TESTPLAYLIST12345",
        sourceType: "playlist",
      }),
      socketId,
    ),
  generate_spotify_candidates: (roomService, socketId) =>
    roomService.generateSpotifyCandidates(
      generateSpotifyCandidatesPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        source: { type: "playlists", playlistIds: ["TESTPLAYLIST12345"] },
      }),
      socketId,
    ),
  use_spotify_candidates: (roomService, socketId) =>
    roomService.useSpotifyCandidates(
      useSpotifyCandidatesPayloadSchema.parse({
        roomId: TEST_ROOM_ID,
        candidateSessionId: "candidate-session-12345",
        trackIds: TRACK_IDS,
      }),
      socketId,
    ),
};

const getPlaylistTracks: PlaylistAction = (roomService, socketId) =>
  roomService.getPlaylistTracks(
    getPlaylistTracksPayloadSchema.parse({ roomId: TEST_ROOM_ID }),
    socketId,
  );

const playlistEditorActions: Record<string, PlaylistAction> = {
  get_playlist_tracks: getPlaylistTracks,
  remove_playlist_tracks: (roomService, socketId) =>
    roomService.removePlaylistTracks(
      removePlaylistTracksPayloadSchema.parse({ roomId: TEST_ROOM_ID, trackIds: ["track-1"] }),
      socketId,
    ),
  update_playlist_track: (roomService, socketId) =>
    roomService.updatePlaylistTrack(
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
      const { roomService, spotifyWork } = createRoomServiceWithGuest();

      expect(() => action(roomService, GUEST_SOCKET_ID)).toThrow("ONLY_HOST_CAN_IMPORT_PLAYLIST");
      for (const spy of spotifyWork) {
        expect(spy).not.toHaveBeenCalled();
      }
    },
  );

  it.each(Object.entries(playlistEditorActions))("refuses %s for a guest", (_event, action) => {
    const { roomService } = createRoomServiceWithGuest();

    expect(() => action(roomService, GUEST_SOCKET_ID)).toThrow("ONLY_HOST_CAN_EDIT_PLAYLIST");
  });

  it.each(Object.entries({ ...musicSetupActions, ...playlistEditorActions }))(
    "refuses %s for the host once the game has started",
    (_event, action) => {
      const { roomService, spotifyWork } = createRoomServiceWithGuest();
      startGame(roomService);

      expect(() => action(roomService, HOST_SOCKET_ID)).toThrow("GAME_ALREADY_STARTED");
      for (const spy of spotifyWork) {
        expect(spy).not.toHaveBeenCalled();
      }
    },
  );

  it("never returns release years to a guest during a game", () => {
    const { roomService } = createRoomServiceWithGuest();
    startGame(roomService);

    expect(() => getPlaylistTracks(roomService, GUEST_SOCKET_ID)).toThrow(
      "ONLY_HOST_CAN_EDIT_PLAYLIST",
    );
  });

  it("returns the deck to the host in the lobby", () => {
    const { roomService } = createRoomServiceWithGuest();

    const tracks = roomService.getPlaylistTracks(
      getPlaylistTracksPayloadSchema.parse({ roomId: TEST_ROOM_ID }),
      HOST_SOCKET_ID,
    );

    expect(tracks).toHaveLength(TRACK_IDS.length);
  });
});
