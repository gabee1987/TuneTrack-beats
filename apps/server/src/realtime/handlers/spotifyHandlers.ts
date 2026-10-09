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
  type ServerErrorCode,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import type { z } from "zod";
import type { RoomService } from "../../rooms/RoomService.js";
import { broadcastRoomState, createSocketHandler } from "../createSocketHandler.js";
import { musicSetupErrorMessages, useSpotifyCandidatesErrorMessages } from "../errorMessages.js";

// Non-toasting error code: signals the client to resolve a pending token request and retry
// later (reconnect race / non-owner caller) without showing a user-facing "reconnect" toast.
const SPOTIFY_TOKEN_REFRESH_DEFERRED_CODE = "SPOTIFY_TOKEN_REFRESH_DEFERRED";
const UNKNOWN_PLAYBACK_REQUEST_ID = "00000000-0000-0000-0000-000000000000";

export function registerSpotifyHandlers(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  registerRequestSpotifyAuthUrlHandler(socket, roomService);
  registerSpotifyLookupHandlers(socket, roomService);
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

interface SpotifyLookup<TSchema extends z.ZodTypeAny> {
  event: string;
  schema: TSchema;
  resultEvent: string;
  invalidPayload: { code: ServerErrorCode; resultCode: string; message: string };
  failureMessage: string;
  fallbackErrorCode: ServerErrorCode;
  run: (data: z.output<TSchema>) => Promise<unknown>;
}

/**
 * Music-setup lookups answer on their result event; an authorisation refusal keeps the
 * generic `error` event so the host sees why.
 */
function registerSpotifyLookupHandler<TSchema extends z.ZodTypeAny>(
  socket: Socket,
  lookup: SpotifyLookup<TSchema>,
): void {
  createSocketHandler({
    socket,
    event: lookup.event,
    schema: lookup.schema,
    invalidPayload: { code: lookup.invalidPayload.code, message: lookup.invalidPayload.message },
    handle: async (data) => {
      socket.emit(lookup.resultEvent, await lookup.run(data));
    },
    failureReply: {
      invalidPayload: () => {
        socket.emit(lookup.resultEvent, {
          success: false,
          code: lookup.invalidPayload.resultCode,
          message: lookup.invalidPayload.message,
        });
      },
      unexpectedError: () => {
        socket.emit(lookup.resultEvent, {
          success: false,
          code: "spotify_api_error",
          message: lookup.failureMessage,
        });
      },
    },
    fallbackErrorCode: lookup.fallbackErrorCode,
    errorMessages: musicSetupErrorMessages,
  });
}

function registerSpotifyLookupHandlers(socket: Socket, roomService: RoomService): void {
  registerSpotifyLookupHandler(socket, {
    event: ClientToServerEvent.SearchSpotifyMusic,
    schema: searchSpotifyMusicPayloadSchema,
    resultEvent: ServerToClientEvent.SpotifySmartSearchResult,
    invalidPayload: {
      code: "INVALID_SEARCH_SPOTIFY_MUSIC_PAYLOAD",
      resultCode: "invalid_query",
      message: "Search query is invalid.",
    },
    failureMessage: "Spotify search failed. Please try again.",
    fallbackErrorCode: "SEARCH_SPOTIFY_MUSIC_FAILED",
    run: (data) => roomService.searchSpotifyMusic(data, socket.id),
  });

  registerSpotifyLookupHandler(socket, {
    event: ClientToServerEvent.OpenSpotifyPlaylist,
    schema: openSpotifyPlaylistPayloadSchema,
    resultEvent: ServerToClientEvent.SpotifyPlaylistDetail,
    invalidPayload: {
      code: "INVALID_OPEN_SPOTIFY_PLAYLIST_PAYLOAD",
      resultCode: "invalid_playlist",
      message: "Playlist selection is invalid.",
    },
    failureMessage: "Spotify playlist could not be opened. Please try again.",
    fallbackErrorCode: "OPEN_SPOTIFY_PLAYLIST_FAILED",
    run: (data) => roomService.openSpotifyPlaylist(data, socket.id),
  });

  registerSpotifyLookupHandler(socket, {
    event: ClientToServerEvent.SearchSpotifyPlaylists,
    schema: searchSpotifyPlaylistsPayloadSchema,
    resultEvent: ServerToClientEvent.SpotifyPlaylistSearchResult,
    invalidPayload: {
      code: "INVALID_SEARCH_SPOTIFY_PLAYLISTS_PAYLOAD",
      resultCode: "invalid_query",
      message: "Search query is invalid.",
    },
    failureMessage: "Spotify playlist search failed. Please try again.",
    fallbackErrorCode: "SEARCH_SPOTIFY_PLAYLISTS_FAILED",
    run: (data) => roomService.searchSpotifyPlaylists(data, socket.id),
  });

  registerSpotifyLookupHandler(socket, {
    event: ClientToServerEvent.GenerateSpotifyCandidates,
    schema: generateSpotifyCandidatesPayloadSchema,
    resultEvent: ServerToClientEvent.SpotifyCandidatesGenerated,
    invalidPayload: {
      code: "INVALID_GENERATE_SPOTIFY_CANDIDATES_PAYLOAD",
      resultCode: "invalid_source",
      message: "Choose at least one Spotify playlist.",
    },
    failureMessage: "Could not generate tracks from those playlists. Please try again.",
    fallbackErrorCode: "GENERATE_SPOTIFY_CANDIDATES_FAILED",
    run: (data) => roomService.generateSpotifyCandidates(data, socket.id),
  });
}

function registerUseSpotifyCandidatesHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.UseSpotifyCandidates,
    schema: useSpotifyCandidatesPayloadSchema,
    invalidPayload: {
      code: "INVALID_USE_SPOTIFY_CANDIDATES_PAYLOAD",
      message: "Keep at least 10 tracks before using this playlist.",
    },
    handle: (data) => {
      const result = roomService.useSpotifyCandidates(data, socket.id);
      socket.emit(ServerToClientEvent.SpotifyCandidatesApplied, result.payload);

      if (result.roomState && result.tracks) {
        socket.emit(ServerToClientEvent.PlaylistTracks, { tracks: result.tracks });
        broadcastRoomState(io, result.roomState);
      }
    },
    failureReply: {
      invalidPayload: () => {
        socket.emit(ServerToClientEvent.SpotifyCandidatesApplied, {
          success: false,
          code: "too_few_tracks",
          message: "Keep at least 10 tracks before using this playlist.",
        });
      },
    },
    fallbackErrorCode: "USE_SPOTIFY_CANDIDATES_FAILED",
    errorMessages: useSpotifyCandidatesErrorMessages,
  });
}

function registerRefreshSpotifyTokenHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  const deferRefresh = (): void => {
    socket.emit(ServerToClientEvent.Error, {
      code: SPOTIFY_TOKEN_REFRESH_DEFERRED_CODE,
      message: "Spotify token refresh deferred.",
    });
  };

  createSocketHandler({
    socket,
    event: ClientToServerEvent.RefreshSpotifyToken,
    schema: refreshSpotifyTokenPayloadSchema,
    invalidPayload: {
      code: "INVALID_REFRESH_SPOTIFY_TOKEN_PAYLOAD",
      message: "Room code is invalid.",
    },
    handle: async (data) => {
      const result = await roomService.refreshSpotifyToken(data, socket.id);
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
      deferRefresh();
    },
    failureReply: { domainError: deferRefresh, unexpectedError: deferRefresh },
    fallbackErrorCode: SPOTIFY_TOKEN_REFRESH_DEFERRED_CODE,
    errorMessages: {},
  });
}

function registerPlaySpotifyTrackHandler(socket: Socket, roomService: RoomService): void {
  const replyPlaybackFailed = (requestId: string, message: string): void => {
    socket.emit(ServerToClientEvent.SpotifyPlaybackResult, {
      success: false,
      requestId,
      code: "spotify_api_error",
      message,
    });
  };
  // The client matches the result to its request by id, so every failure answers there.
  const replyCouldNotStart = (data: { requestId: string }): void => {
    replyPlaybackFailed(data.requestId, "Spotify could not start playback.");
  };

  createSocketHandler({
    socket,
    event: ClientToServerEvent.PlaySpotifyTrack,
    schema: playSpotifyTrackPayloadSchema,
    invalidPayload: {
      code: "INVALID_PLAY_SPOTIFY_TRACK_PAYLOAD",
      message: "Playback request is invalid.",
    },
    handle: async (data) => {
      socket.emit(
        ServerToClientEvent.SpotifyPlaybackResult,
        await roomService.playSpotifyTrack(data, socket.id),
      );
    },
    failureReply: {
      invalidPayload: (payload) => {
        replyPlaybackFailed(readPlaybackRequestId(payload), "Playback request is invalid.");
      },
      domainError: replyCouldNotStart,
      unexpectedError: replyCouldNotStart,
    },
    fallbackErrorCode: "PLAY_SPOTIFY_TRACK_FAILED",
    errorMessages: {},
  });
}

function readPlaybackRequestId(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return UNKNOWN_PLAYBACK_REQUEST_ID;
  const requestId = (payload as { requestId?: unknown }).requestId;
  return typeof requestId === "string" ? requestId : UNKNOWN_PLAYBACK_REQUEST_ID;
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
