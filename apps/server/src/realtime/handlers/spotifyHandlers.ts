import {
  ClientToServerEvent,
  ServerToClientEvent,
  generateSpotifyCandidatesPayloadSchema,
  openSpotifyPlaylistPayloadSchema,
  refreshSpotifyTokenPayloadSchema,
  requestSpotifyAuthUrlPayloadSchema,
  searchSpotifyMusicPayloadSchema,
  searchSpotifyPlaylistsPayloadSchema,
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
        if (result.result) {
          socket.emit(ServerToClientEvent.SpotifyTokenRefreshed, result.result);
        } else {
          if (result.roomState) {
            broadcastRoomState(io, result.roomState);
          }
          socket.emit(ServerToClientEvent.Error, {
            code: "SPOTIFY_TOKEN_REFRESH_FAILED",
            message: "Could not refresh Spotify token. Please reconnect Spotify.",
          });
        }
      })
      .catch((error: unknown) => {
        logger.error({ error }, "refresh_spotify_token handler threw unexpectedly");
        socket.emit(ServerToClientEvent.Error, {
          code: "SPOTIFY_TOKEN_REFRESH_FAILED",
          message: "Could not refresh Spotify token.",
        });
      });
  });
}
