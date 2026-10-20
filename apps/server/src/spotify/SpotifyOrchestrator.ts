import type {
  GenerateSpotifyCandidatesPayloadParsed,
  OpenSpotifyPlaylistPayloadParsed,
  PlaySpotifyTrackPayloadParsed,
  PublicRoomState,
  PublicTrackInfo,
  RefreshSpotifyTokenPayloadParsed,
  RegisterSpotifyPlaybackDevicePayloadParsed,
  RequestSpotifyAuthUrlPayloadParsed,
  RoomId,
  SearchSpotifyMusicPayloadParsed,
  SearchSpotifyPlaylistsPayloadParsed,
  SpotifyAccountType,
  SpotifyCandidatesAppliedPayload,
  SpotifyCandidatesGeneratedPayload,
  SpotifyPlaybackResultPayload,
  SpotifyPlaylistDetailPayload,
  SpotifyPlaylistSearchResultPayload,
  SpotifySmartSearchResultPayload,
  UnregisterSpotifyPlaybackDevicePayloadParsed,
  UseSpotifyCandidatesPayloadParsed,
} from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { cardToPublicTrackInfo } from "../rooms/publicTrackInfo.js";
import { isHost, requireHost, requireSpotifyPlaybackOwner } from "../rooms/roomAuthorization.js";
import type { RoomDeckService } from "../rooms/RoomDeckService.js";
import type { RoomEvents } from "../rooms/RoomEvents.js";
import type { RoomLobbyService } from "../rooms/RoomLobbyService.js";
import type { RoomStore } from "../rooms/RoomStore.js";
import type { SpotifyAuthService } from "./SpotifyAuthService.js";
import type { SpotifyCandidateGenerator } from "./SpotifyCandidateGenerator.js";
import type { SpotifyMusicSearchService } from "./SpotifyMusicSearchService.js";
import type { SpotifyPlaybackController } from "./SpotifyPlaybackController.js";
import type { SpotifyPlaybackSessionStore } from "./SpotifyPlaybackSessionStore.js";
import type { SpotifyPlaylistSearch } from "./SpotifyPlaylistSearch.js";

export type RefreshTokenResult =
  | { status: "refreshed"; accessToken: string; expiresInSeconds: number }
  | { status: "reauth_required"; roomState: PublicRoomState }
  | { status: "deferred" };

export interface UseSpotifyCandidatesResult {
  payload: SpotifyCandidatesAppliedPayload;
  roomState: PublicRoomState | null;
  tracks: PublicTrackInfo[] | null;
}

export interface SpotifyServices {
  auth: SpotifyAuthService;
  candidates: SpotifyCandidateGenerator;
  musicSearch: SpotifyMusicSearchService;
  playback: SpotifyPlaybackController;
  playbackSessions: SpotifyPlaybackSessionStore;
  playlistSearch: SpotifyPlaylistSearch;
}

const NOT_MUSIC_SETUP_HOST = "ONLY_HOST_CAN_IMPORT_PLAYLIST";

/** Every Spotify action a room member can trigger, authorised against the room first. */
export class SpotifyOrchestrator {
  public constructor(
    private readonly store: RoomStore,
    private readonly lobby: RoomLobbyService,
    private readonly deck: RoomDeckService,
    private readonly spotify: SpotifyServices,
  ) {}

  /** Keeps the per-room Spotify stores in step with the room's lifecycle. */
  public followRoomLifecycle(events: RoomEvents): void {
    events.on("spotifyPlaybackHandoff", (roomId) => {
      this.spotify.playbackSessions.beginHandoff(roomId);
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "playback_handoff_started",
        outcome: "succeeded",
        roomId,
      });
      void this.spotify.playback.pauseRoomPlayback(roomId);
    });
    events.on("roomExpired", (roomId) => {
      this.clearRoom(roomId);
      logger.info({ roomId }, "offline room expired");
    });
    events.on("roomClosed", (roomId) => this.clearRoom(roomId));
    events.on("roomRenamed", (previousRoomId, nextRoomId) => {
      this.spotify.auth.retargetRoom(previousRoomId, nextRoomId);
      this.spotify.playbackSessions.retargetRoom(previousRoomId, nextRoomId);
      this.spotify.candidates.retargetRoom(previousRoomId, nextRoomId);
    });
    events.on("socketLeft", (socketId) => {
      this.spotify.playbackSessions.unregisterBySocketId(socketId);
    });
  }

  private clearRoom(roomId: RoomId): void {
    this.spotify.auth.clearHostTokens(roomId);
    this.spotify.playbackSessions.clearRoom(roomId);
  }

  public buildSpotifyAuthUrl(
    payload: RequestSpotifyAuthUrlPayloadParsed,
    socketId: string,
  ): string {
    requireHost(this.store, socketId, payload.roomId, "ONLY_HOST_CAN_CONTROL_SPOTIFY_PLAYBACK");
    return this.spotify.auth.buildAuthUrl(payload.roomId, socketId, payload.clientOrigin);
  }

  public isRoomHostSocket(roomId: string, socketId: string): boolean {
    return isHost(this.store, socketId, roomId);
  }

  public searchSpotifyPlaylists(
    payload: SearchSpotifyPlaylistsPayloadParsed,
    socketId: string,
  ): Promise<SpotifyPlaylistSearchResultPayload> {
    this.deck.requireHostInLobby(socketId, payload.roomId, NOT_MUSIC_SETUP_HOST);
    return this.spotify.playlistSearch.searchPlaylists(
      payload.roomId,
      payload.query,
      payload.limit,
    );
  }

  public searchSpotifyMusic(
    payload: SearchSpotifyMusicPayloadParsed,
    socketId: string,
  ): Promise<SpotifySmartSearchResultPayload> {
    this.deck.requireHostInLobby(socketId, payload.roomId, NOT_MUSIC_SETUP_HOST);
    return this.spotify.musicSearch.search(
      payload.roomId,
      payload.query,
      payload.limit,
      payload.offset,
      payload.types,
    );
  }

  public openSpotifyPlaylist(
    payload: OpenSpotifyPlaylistPayloadParsed,
    socketId: string,
  ): Promise<SpotifyPlaylistDetailPayload> {
    this.deck.requireHostInLobby(socketId, payload.roomId, NOT_MUSIC_SETUP_HOST);
    return this.spotify.musicSearch.getPlaylistDetail(
      payload.roomId,
      payload.playlistId,
      payload.sourceType,
    );
  }

  public generateSpotifyCandidates(
    payload: GenerateSpotifyCandidatesPayloadParsed,
    socketId: string,
  ): Promise<SpotifyCandidatesGeneratedPayload> {
    this.deck.requireHostInLobby(socketId, payload.roomId, NOT_MUSIC_SETUP_HOST);
    return this.spotify.candidates
      .generateCandidates(payload.roomId, payload.source)
      .then((result) => result.payload);
  }

  public useSpotifyCandidates(
    payload: UseSpotifyCandidatesPayloadParsed,
    socketId: string,
  ): UseSpotifyCandidatesResult {
    this.deck.requireHostInLobby(socketId, payload.roomId, NOT_MUSIC_SETUP_HOST);
    const result = this.spotify.candidates.applyCandidates(
      payload.roomId,
      payload.candidateSessionId,
      payload.trackIds,
      payload.tracks,
    );

    if (!result.cards) {
      return { payload: result.payload, roomState: null, tracks: null };
    }

    const { roomState, deck } = this.deck.updateImportedDeck(
      socketId,
      payload.roomId,
      result.cards,
      payload.mode,
    );

    return {
      payload: result.payload.success
        ? { ...result.payload, importedCount: deck.length }
        : result.payload,
      roomState,
      tracks: deck.map(cardToPublicTrackInfo),
    };
  }

  public async refreshSpotifyToken(
    payload: RefreshSpotifyTokenPayloadParsed,
    socketId: string,
  ): Promise<RefreshTokenResult> {
    try {
      requireSpotifyPlaybackOwner(this.store, socketId, payload.roomId);
    } catch {
      // Socket membership not yet restored (reconnect race) or caller is not the
      // playback owner. Neither is user-actionable — defer silently so the client retries.
      return { status: "deferred" };
    }

    const result = await this.spotify.auth.refreshHostToken(payload.roomId);

    if (result.success) {
      return {
        status: "refreshed",
        accessToken: result.accessToken,
        expiresInSeconds: result.expiresInSeconds,
      };
    }

    // Only a revoked/expired refresh token requires the user to reconnect Spotify.
    // Transient API failures defer silently and rely on the client's retry cadence.
    if (result.reason === "invalid_grant") {
      return {
        status: "reauth_required",
        roomState: this.updateSpotifyAuthStatus(payload.roomId, socketId, false, null),
      };
    }

    return { status: "deferred" };
  }

  public async playSpotifyTrack(
    payload: PlaySpotifyTrackPayloadParsed,
    socketId: string,
  ): Promise<SpotifyPlaybackResultPayload> {
    const roomState = this.store.getRoomStateForMember(socketId, payload.roomId);
    const currentPlaybackGeneration = roomState.settings.spotifyPlaybackGeneration ?? 0;

    if (payload.playbackGeneration !== currentPlaybackGeneration) {
      return {
        success: false,
        requestId: payload.requestId,
        code: "stale_playback_generation",
        message: "Playback moved to a different host. Retry after reclaiming the player.",
      };
    }

    try {
      requireSpotifyPlaybackOwner(this.store, socketId, payload.roomId);
    } catch {
      return {
        success: false,
        requestId: payload.requestId,
        code: "not_playback_owner",
        message: "Only the current host can control Spotify playback.",
      };
    }

    const sessions = this.spotify.playbackSessions;
    sessions.registerDevice(payload.roomId, socketId, payload.deviceId);
    sessions.beginPlayRequest(payload.roomId, payload.requestId);

    return sessions.runExclusive(payload.roomId, async () => {
      if (!sessions.isActivePlayRequest(payload.roomId, payload.requestId)) {
        return {
          success: false,
          requestId: payload.requestId,
          code: "superseded",
          message: "A newer playback request replaced this one.",
        } as const;
      }

      return this.spotify.playback.playTrackOnHostDevice(
        payload.roomId,
        payload.deviceId,
        payload.spotifyTrackUri,
        {
          requestId: payload.requestId,
          isSuperseded: () => !sessions.isActivePlayRequest(payload.roomId, payload.requestId),
        },
      );
    });
  }

  public registerSpotifyPlaybackDevice(
    payload: RegisterSpotifyPlaybackDevicePayloadParsed,
    socketId: string,
  ): void {
    const roomState = this.store.getRoomStateForMember(socketId, payload.roomId);
    const currentPlaybackGeneration = roomState.settings.spotifyPlaybackGeneration ?? 0;

    // Soft-ignore stale registrations during handoff races — never surface as a room error toast.
    if (payload.playbackGeneration !== currentPlaybackGeneration) {
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "playback_device_register_ignored_stale",
        outcome: "succeeded",
        roomId: payload.roomId,
        socketId,
        meta: {
          deviceId: payload.deviceId,
          payloadGeneration: payload.playbackGeneration,
          currentGeneration: currentPlaybackGeneration,
        },
      });
      return;
    }

    requireSpotifyPlaybackOwner(this.store, socketId, payload.roomId);
    this.spotify.playbackSessions.registerDevice(payload.roomId, socketId, payload.deviceId);
    logAuditEvent({
      auditKind: "spotify_auth",
      action: "playback_device_registered",
      outcome: "succeeded",
      roomId: payload.roomId,
      socketId,
      meta: {
        deviceId: payload.deviceId,
        playbackGeneration: payload.playbackGeneration,
      },
    });
  }

  public unregisterSpotifyPlaybackDevice(
    payload: UnregisterSpotifyPlaybackDevicePayloadParsed,
    socketId: string,
  ): void {
    this.spotify.playbackSessions.unregisterDevice(payload.roomId, socketId);
  }

  public updateSpotifyAuthStatus(
    roomId: string,
    socketId: string,
    connected: boolean,
    accountType: SpotifyAccountType | null,
  ): PublicRoomState {
    return this.lobby.setSpotifyAuthStatus(
      socketId,
      roomId,
      connected ? "connected" : "none",
      accountType,
    );
  }
}
