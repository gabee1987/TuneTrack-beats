import {
  ClientToServerEvent,
  generateSpotifyCandidatesPayloadSchema,
  refreshSpotifyTokenPayloadSchema,
  registerSpotifyPlaybackDevicePayloadSchema,
  renameRoomPayloadSchema,
  requestSpotifyAuthUrlPayloadSchema,
  useSpotifyCandidatesPayloadSchema,
} from "@tunetrack/shared";
import { describe, expect, it, vi } from "vitest";
import { DeckService } from "../../src/decks/DeckService.js";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { RoomService } from "../../src/rooms/RoomService.js";
import type { SpotifyApiClient, SpotifyApiTrack } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyDiscoveryService } from "../../src/spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

const PREVIOUS_ROOM_ID = "TEST_ROOM_1";
const NEXT_ROOM_ID = "TEST_ROOM_2";
const HOST_SOCKET_ID = "host-socket";
const CANDIDATE_TRACK_COUNT = 10;

function buildPlaylistTrack(index: number): SpotifyApiTrack {
  return {
    id: `track-${index + 1}`,
    name: `Test Song ${index + 1}`,
    artists: [{ name: "Test Artist" }],
    album: { name: "Test Album", release_date: `${1980 + index}-01-01`, images: [] },
    preview_url: null,
    uri: `spotify:track:TESTTRACK${index + 1}`,
  };
}

function createHostRoom() {
  const apiClient = {
    buildAuthUrl: vi.fn(
      (state: string) =>
        `https://accounts.example.test/authorize?state=${encodeURIComponent(state)}`,
    ),
    exchangeCodeForTokens: vi.fn(async () => ({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    })),
    getUserProfile: vi.fn(async () => ({ product: "premium" })),
    refreshAccessToken: vi.fn(async () => ({ access_token: "refreshed-token", expires_in: 3600 })),
    getAllPlaylistTracks: vi.fn(async () =>
      Array.from({ length: CANDIDATE_TRACK_COUNT }, (_, index) => buildPlaylistTrack(index)),
    ),
  } as unknown as SpotifyApiClient;
  const tokenStore = new SpotifyTokenStore();
  tokenStore.setClientCredentials("client-token", 3600);
  const spotifyAuthService = new SpotifyAuthService(apiClient, tokenStore);
  const playbackSessions = new SpotifyPlaybackSessionStore();
  const roomService = new RoomService(
    new RoomRegistry(),
    new DeckService(),
    spotifyAuthService,
    new PlaylistImportService(apiClient, tokenStore),
    new SpotifyDiscoveryService(apiClient, tokenStore),
    new SpotifyMusicSearchService(apiClient, tokenStore),
    playbackSessions,
  );
  roomService.createRoom(
    { roomId: PREVIOUS_ROOM_ID, displayName: "Player One", sessionId: "session-host" },
    HOST_SOCKET_ID,
  );
  return { playbackSessions, roomService, spotifyAuthService };
}

function issueAuthState(roomService: RoomService): string {
  const authUrl = roomService.buildSpotifyAuthUrl(
    requestSpotifyAuthUrlPayloadSchema.parse({ roomId: PREVIOUS_ROOM_ID }),
    HOST_SOCKET_ID,
  );
  return new URL(authUrl).searchParams.get("state") ?? "";
}

async function connectSpotify(roomService: RoomService, spotifyAuthService: SpotifyAuthService) {
  await spotifyAuthService.handleCallback(
    "code-12345",
    issueAuthState(roomService),
    undefined,
    () => true,
  );
  roomService.updateSpotifyAuthStatus(PREVIOUS_ROOM_ID, HOST_SOCKET_ID, true, "premium");
}

function renameRoom(roomService: RoomService): void {
  roomService.renameRoom(
    renameRoomPayloadSchema.parse({ roomId: PREVIOUS_ROOM_ID, nextRoomId: NEXT_ROOM_ID }),
    HOST_SOCKET_ID,
  );
}

describe("renaming a room keeps every room-keyed record", () => {
  it("keeps the host's Spotify login and lets it refresh", async () => {
    const { roomService, spotifyAuthService } = createHostRoom();
    await connectSpotify(roomService, spotifyAuthService);

    renameRoom(roomService);

    expect(spotifyAuthService.isRoomSpotifyConnected(NEXT_ROOM_ID)).toBe(true);
    expect(spotifyAuthService.isRoomSpotifyConnected(PREVIOUS_ROOM_ID)).toBe(false);
    const refresh = await roomService.refreshSpotifyToken(
      refreshSpotifyTokenPayloadSchema.parse({ roomId: NEXT_ROOM_ID }),
      HOST_SOCKET_ID,
    );
    expect(refresh.status).toBe("refreshed");
  });

  it("completes a Spotify login that was started before the rename", async () => {
    const { roomService, spotifyAuthService } = createHostRoom();
    const state = issueAuthState(roomService);

    renameRoom(roomService);
    const result = await spotifyAuthService.handleCallback(
      "code-12345",
      state,
      undefined,
      (roomId, socketId) => roomService.isRoomHostSocket(roomId, socketId),
    );

    expect(result.roomId).toBe(NEXT_ROOM_ID);
    expect(result.authResult.success).toBe(true);
    expect(spotifyAuthService.isRoomSpotifyConnected(NEXT_ROOM_ID)).toBe(true);
  });

  it("keeps the registered playback device", async () => {
    const { playbackSessions, roomService, spotifyAuthService } = createHostRoom();
    await connectSpotify(roomService, spotifyAuthService);
    roomService.registerSpotifyPlaybackDevice(
      registerSpotifyPlaybackDevicePayloadSchema.parse({
        roomId: PREVIOUS_ROOM_ID,
        deviceId: "device-12345",
        playbackGeneration: 0,
      }),
      HOST_SOCKET_ID,
    );

    renameRoom(roomService);

    expect(playbackSessions.getRegisteredDevice(NEXT_ROOM_ID)).toEqual({
      deviceId: "device-12345",
      socketId: HOST_SOCKET_ID,
    });
    expect(playbackSessions.getRegisteredDevice(PREVIOUS_ROOM_ID)).toBeNull();
  });

  it("keeps generated playlist candidates usable", async () => {
    const { roomService } = createHostRoom();
    const generated = await roomService.generateSpotifyCandidates(
      generateSpotifyCandidatesPayloadSchema.parse({
        roomId: PREVIOUS_ROOM_ID,
        source: { type: "playlists", playlistIds: ["TESTPLAYLIST12345"] },
      }),
      HOST_SOCKET_ID,
    );
    if (!generated.success) throw new Error("candidate generation failed");

    renameRoom(roomService);
    const applied = roomService.useSpotifyCandidates(
      useSpotifyCandidatesPayloadSchema.parse({
        roomId: NEXT_ROOM_ID,
        candidateSessionId: generated.candidateSessionId,
        trackIds: generated.tracks.map((track) => track.id),
      }),
      HOST_SOCKET_ID,
    );

    expect(applied.payload.success).toBe(true);
  });

  it("replays an action acknowledged before the rename", () => {
    const { roomService } = createHostRoom();
    const ack = { ok: true, requestId: "00000000-0000-4000-8000-000000012345" };
    const event = ClientToServerEvent.SkipTurn;
    roomService.rememberProcessedActionAck(
      { socketId: HOST_SOCKET_ID, roomId: PREVIOUS_ROOM_ID, event },
      ack,
    );

    renameRoom(roomService);

    expect(
      roomService.getProcessedActionAck(
        { socketId: HOST_SOCKET_ID, roomId: NEXT_ROOM_ID, event },
        ack.requestId,
      ),
    ).toEqual(ack);
  });
});
