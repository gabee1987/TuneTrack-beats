import {
  ClientToServerEvent,
  ServerToClientEvent,
  generateSpotifyCandidatesPayloadSchema,
  openSpotifyPlaylistPayloadSchema,
  playSpotifyTrackPayloadSchema,
  refreshSpotifyTokenPayloadSchema,
  registerSpotifyPlaybackDevicePayloadSchema,
  requestSpotifyAuthUrlPayloadSchema,
  searchSpotifyMusicPayloadSchema,
  searchSpotifyPlaylistsPayloadSchema,
  unregisterSpotifyPlaybackDevicePayloadSchema,
  useSpotifyCandidatesPayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../../app/logger.js";
import type { RoomService } from "../../rooms/RoomService.js";
import {
  broadcastRoomState,
  createSocketHandler,
  emitServerError,
} from "../createSocketHandler.js";
import { useSpotifyCandidatesErrorMessages } from "../errorMessages.js";

// Non-toasting error code: signals the client to resolve a pending token request and retry
// later (reconnect race / non-owner caller) without showing a user-facing "reconnect" toast.
const SPOTIFY_TOKEN_REFRESH_DEFERRED_CODE = "SPOTIFY_TOKEN_REFRESH_DEFERRED";

export function registerSpotifyHandlers(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  registerRequestSpotifyAuthUrlHandler(socket, roomService);
  registerSearchSpotifyMusicHandler(socket, roomService);
  registerOpenSpotifyPlaylistHandler(socket, roomService);
  registerSearchSpotifyPlaylistsHandler(socket, roomService);
  registerGenerateSpotifyCandidatesHandler(socket, roomService);
  registerUseSpotifyCandidatesHandler(io, socket, roomService);
  registerRefreshSpotifyTokenHandler(io, socket, roomService);
  registerPlaySpotifyTrackHandler(socket, roomService);
  registerSpotifyPlaybackDeviceHandlers(socket, roomService);
}

function registerRequestSpotifyAuthUrlHandler(socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.RequestSpotifyAuthUrl,
    schema: requestSpotifyAuthUrlPayloadSchema,
    invalidPayload: {
      code: "INVALID_REQUEST_SPOTIFY_AUTH_URL_PAYLOAD",
      message: "Room code is invalid.",
    },
    handle: (data) => {
      const authUrl = roomService.buildSpotifyAuthUrl(data, socket.id);
      socket.emit(ServerToClientEvent.SpotifyAuthUrl, { authUrl });
    },
    fallbackErrorCode: "REQUEST_SPOTIFY_AUTH_URL_FAILED",
    errorMessages: {},
  });
}

function registerSearchSpotifyMusicHandler(socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.SearchSpotifyMusic, (payload: unknown) => {
    const parseResult = searchSpotifyMusicPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.SpotifySmartSearchResult, {
        success: false,
        code: "invalid_query",
        message: "Search query is invalid.",
      });
      return;
    }

    void Promise.resolve()
      .then(() => roomService.searchSpotifyMusic(parseResult.data, socket.id))
      .then((result) => {
        socket.emit(ServerToClientEvent.SpotifySmartSearchResult, result);
      })
      .catch((error: unknown) => {
        logger.error({ error }, "search_spotify_music handler threw unexpectedly");
        socket.emit(ServerToClientEvent.SpotifySmartSearchResult, {
          success: false,
          code: "spotify_api_error",
          message: "Spotify search failed. Please try again.",
        });
      });
  });
}

function registerOpenSpotifyPlaylistHandler(socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.OpenSpotifyPlaylist, (payload: unknown) => {
    const parseResult = openSpotifyPlaylistPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.SpotifyPlaylistDetail, {
        success: false,
        code: "invalid_playlist",
        message: "Playlist selection is invalid.",
      });
      return;
    }

    void Promise.resolve()
      .then(() => roomService.openSpotifyPlaylist(parseResult.data, socket.id))
      .then((result) => {
        socket.emit(ServerToClientEvent.SpotifyPlaylistDetail, result);
      })
      .catch((error: unknown) => {
        logger.error({ error }, "open_spotify_playlist handler threw unexpectedly");
        socket.emit(ServerToClientEvent.SpotifyPlaylistDetail, {
          success: false,
          code: "spotify_api_error",
          message: "Spotify playlist could not be opened. Please try again.",
        });
      });
  });
}

function registerSearchSpotifyPlaylistsHandler(socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.SearchSpotifyPlaylists, (payload: unknown) => {
    const parseResult = searchSpotifyPlaylistsPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.SpotifyPlaylistSearchResult, {
        success: false,
        code: "invalid_query",
        message: "Search query is invalid.",
      });
      return;
    }

    void Promise.resolve()
      .then(() => roomService.searchSpotifyPlaylists(parseResult.data, socket.id))
      .then((result) => {
        socket.emit(ServerToClientEvent.SpotifyPlaylistSearchResult, result);
      })
      .catch((error: unknown) => {
        logger.error({ error }, "search_spotify_playlists handler threw unexpectedly");
        socket.emit(ServerToClientEvent.SpotifyPlaylistSearchResult, {
          success: false,
          code: "spotify_api_error",
          message: "Spotify playlist search failed. Please try again.",
        });
      });
  });
}

function registerGenerateSpotifyCandidatesHandler(socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.GenerateSpotifyCandidates, (payload: unknown) => {
    const parseResult = generateSpotifyCandidatesPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.SpotifyCandidatesGenerated, {
        success: false,
        code: "invalid_source",
        message: "Choose at least one Spotify playlist.",
      });
      return;
    }

    void Promise.resolve()
      .then(() => roomService.generateSpotifyCandidates(parseResult.data, socket.id))
      .then((result) => {
        socket.emit(ServerToClientEvent.SpotifyCandidatesGenerated, result);
      })
      .catch((error: unknown) => {
        logger.error({ error }, "generate_spotify_candidates handler threw unexpectedly");
        socket.emit(ServerToClientEvent.SpotifyCandidatesGenerated, {
          success: false,
          code: "spotify_api_error",
          message: "Could not generate tracks from those playlists. Please try again.",
        });
      });
  });
}

function registerUseSpotifyCandidatesHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.UseSpotifyCandidates, (payload: unknown) => {
    const parseResult = useSpotifyCandidatesPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.SpotifyCandidatesApplied, {
        success: false,
        code: "too_few_tracks",
        message: "Keep at least 10 tracks before using this playlist.",
      });
      return;
    }

    try {
      const result = roomService.useSpotifyCandidates(parseResult.data, socket.id);
      socket.emit(ServerToClientEvent.SpotifyCandidatesApplied, result.payload);

      if (result.roomState && result.tracks) {
        socket.emit(ServerToClientEvent.PlaylistTracks, { tracks: result.tracks });
        broadcastRoomState(io, result.roomState);
      }
    } catch (error) {
      emitServerError(socket, error, "USE_SPOTIFY_CANDIDATES_FAILED", useSpotifyCandidatesErrorMessages);
    }
  });
}

function registerRefreshSpotifyTokenHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.RefreshSpotifyToken, (payload: unknown) => {
    const parseResult = refreshSpotifyTokenPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_REFRESH_SPOTIFY_TOKEN_PAYLOAD",
        message: "Room code is invalid.",
      });
      return;
    }

    void roomService
      .refreshSpotifyToken(parseResult.data, socket.id)
      .then((result) => {
        if (result.status === "refreshed") {
          socket.emit(ServerToClientEvent.SpotifyTokenRefreshed, {
            accessToken: result.accessToken,
            expiresInSeconds: result.expiresInSeconds,
          });
          return;
        }

        if (result.status === "reauth_required") {
          broadcastRoomState(io, result.roomState);
          socket.emit(ServerToClientEvent.Error, {
            code: "SPOTIFY_TOKEN_REFRESH_FAILED",
            message: "Could not refresh Spotify token. Please reconnect Spotify.",
          });
          return;
        }

        // Deferred: transient reconnect race or non-owner caller — resolve the client's
        // pending request without surfacing a user-facing error toast.
        socket.emit(ServerToClientEvent.Error, {
          code: SPOTIFY_TOKEN_REFRESH_DEFERRED_CODE,
          message: "Spotify token refresh deferred.",
        });
      })
      .catch((error: unknown) => {
        logger.error({ error }, "refresh_spotify_token handler threw unexpectedly");
        socket.emit(ServerToClientEvent.Error, {
          code: SPOTIFY_TOKEN_REFRESH_DEFERRED_CODE,
          message: "Spotify token refresh deferred.",
        });
      });
  });
}

function registerPlaySpotifyTrackHandler(socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.PlaySpotifyTrack, (payload: unknown) => {
    const parseResult = playSpotifyTrackPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      const requestId =
        typeof payload === "object" &&
        payload !== null &&
        "requestId" in payload &&
        typeof (payload as { requestId?: unknown }).requestId === "string"
          ? (payload as { requestId: string }).requestId
          : "00000000-0000-0000-0000-000000000000";
      socket.emit(ServerToClientEvent.SpotifyPlaybackResult, {
        success: false,
        requestId,
        code: "spotify_api_error",
        message: "Playback request is invalid.",
      });
      return;
    }

    void roomService
      .playSpotifyTrack(parseResult.data, socket.id)
      .then((result) => {
        socket.emit(ServerToClientEvent.SpotifyPlaybackResult, result);
      })
      .catch((error: unknown) => {
        logger.error({ error }, "play_spotify_track handler threw unexpectedly");
        socket.emit(ServerToClientEvent.SpotifyPlaybackResult, {
          success: false,
          requestId: parseResult.data.requestId,
          code: "spotify_api_error",
          message: "Spotify could not start playback.",
        });
      });
  });
}

function registerSpotifyPlaybackDeviceHandlers(socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.RegisterSpotifyPlaybackDevice,
    schema: registerSpotifyPlaybackDevicePayloadSchema,
    invalidPayload: {
      code: "INVALID_REGISTER_SPOTIFY_PLAYBACK_DEVICE_PAYLOAD",
      message: "Playback device registration is invalid.",
    },
    handle: (data) => {
      roomService.registerSpotifyPlaybackDevice(data, socket.id);
    },
    fallbackErrorCode: "REGISTER_SPOTIFY_PLAYBACK_DEVICE_FAILED",
    errorMessages: {
      ONLY_SPOTIFY_PLAYBACK_OWNER_CAN_CONTROL:
        "Only the current host can register Spotify playback.",
    },
  });

  createSocketHandler({
    socket,
    event: ClientToServerEvent.UnregisterSpotifyPlaybackDevice,
    schema: unregisterSpotifyPlaybackDevicePayloadSchema,
    invalidPayload: {
      code: "INVALID_UNREGISTER_SPOTIFY_PLAYBACK_DEVICE_PAYLOAD",
      message: "Playback device unregistration is invalid.",
    },
    handle: (data) => {
      roomService.unregisterSpotifyPlaybackDevice(data, socket.id);
    },
    fallbackErrorCode: "UNREGISTER_SPOTIFY_PLAYBACK_DEVICE_FAILED",
    errorMessages: {},
  });
}
