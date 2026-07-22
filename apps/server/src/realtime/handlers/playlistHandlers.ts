import {
  ClientToServerEvent,
  ServerToClientEvent,
  getPlaylistTracksPayloadSchema,
  importPlaylistPayloadSchema,
  loadCuratedPlaylistPayloadSchema,
  removePlaylistTracksPayloadSchema,
  updatePlaylistTrackPayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../../app/logger.js";
import type { RoomService } from "../../rooms/RoomService.js";
import { broadcastRoomState, createSocketHandler } from "../createSocketHandler.js";
import {
  loadCuratedPlaylistErrorMessages,
  removePlaylistTracksErrorMessages,
  updatePlaylistTrackErrorMessages,
} from "../errorMessages.js";

export function registerPlaylistHandlers(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  registerImportPlaylistHandler(io, socket, roomService);
  registerLoadCuratedPlaylistHandler(io, socket, roomService);
  registerGetPlaylistTracksHandler(socket, roomService);
  registerRemovePlaylistTracksHandler(io, socket, roomService);
  registerUpdatePlaylistTrackHandler(io, socket, roomService);
}

function registerImportPlaylistHandler(io: Server, socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.ImportPlaylist, (payload: unknown) => {
    const parseResult = importPlaylistPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.PlaylistImportResult, {
        success: false,
        code: "invalid_url",
        message: "Playlist URL is invalid.",
      });
      return;
    }

    void roomService
      .importPlaylist(parseResult.data, socket.id)
      .then(({ roomState, resultPayload }) => {
        socket.emit(ServerToClientEvent.PlaylistImportResult, resultPayload);

        if (resultPayload.success) {
          broadcastRoomState(io, roomState);
        }
      })
      .catch((error: unknown) => {
        logger.error({ error }, "import_playlist handler threw unexpectedly");
        socket.emit(ServerToClientEvent.PlaylistImportResult, {
          success: false,
          code: "spotify_api_error",
          message: "An unexpected error occurred. Please try again.",
        });
      });
  });
}

function registerLoadCuratedPlaylistHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.LoadCuratedPlaylist,
    schema: loadCuratedPlaylistPayloadSchema,
    invalidPayload: {
      code: "INVALID_LOAD_CURATED_PLAYLIST_PAYLOAD",
      message: "Saved playlist data is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          count: data.tracks.length,
        },
        "load_curated_playlist",
      );
    },
    handle: (data) => {
      const { roomState, tracks } = roomService.loadCuratedPlaylist(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTracks, { tracks });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "LOAD_CURATED_PLAYLIST_FAILED",
    errorMessages: loadCuratedPlaylistErrorMessages,
  });
}

function registerGetPlaylistTracksHandler(socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.GetPlaylistTracks,
    schema: getPlaylistTracksPayloadSchema,
    invalidPayload: {
      code: "INVALID_GET_PLAYLIST_TRACKS_PAYLOAD",
      message: "Room code is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "get_playlist_tracks");
    },
    handle: (data) => {
      const tracks = roomService.getPlaylistTracks(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTracks, { tracks });
    },
    fallbackErrorCode: "GET_PLAYLIST_TRACKS_FAILED",
    errorMessages: {},
  });
}

function registerRemovePlaylistTracksHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.RemovePlaylistTracks,
    schema: removePlaylistTracksPayloadSchema,
    invalidPayload: {
      code: "INVALID_REMOVE_PLAYLIST_TRACKS_PAYLOAD",
      message: "Invalid request.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          count: data.trackIds.length,
        },
        "remove_playlist_tracks",
      );
    },
    handle: (data) => {
      const { roomState, tracks } = roomService.removePlaylistTracks(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTracks, { tracks });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "REMOVE_PLAYLIST_TRACKS_FAILED",
    errorMessages: removePlaylistTracksErrorMessages,
  });
}

function registerUpdatePlaylistTrackHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.UpdatePlaylistTrack,
    schema: updatePlaylistTrackPayloadSchema,
    invalidPayload: {
      code: "INVALID_UPDATE_PLAYLIST_TRACK_PAYLOAD",
      message: "Track metadata is invalid.",
    },
    log: (data) => {
      logger.info(
        { socketId: socket.id, roomId: data.roomId, trackId: data.trackId },
        "update_playlist_track",
      );
    },
    handle: (data) => {
      const { roomState, tracks } = roomService.updatePlaylistTrack(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTracks, { tracks });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "UPDATE_PLAYLIST_TRACK_FAILED",
    errorMessages: updatePlaylistTrackErrorMessages,
  });
}
