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
import type { RoomServices } from "../../app/createRoomServices.js";
import { broadcastRoomState, createSocketHandler } from "../createSocketHandler.js";
import {
  getPlaylistTracksErrorMessages,
  loadCuratedPlaylistErrorMessages,
  musicSetupErrorMessages,
  removePlaylistTracksErrorMessages,
  updatePlaylistTrackErrorMessages,
} from "../errorMessages.js";

export function registerPlaylistHandlers(io: Server, socket: Socket, services: RoomServices): void {
  registerImportPlaylistHandler(io, socket, services);
  registerLoadCuratedPlaylistHandler(io, socket, services);
  registerGetPlaylistTracksHandler(socket, services);
  registerRemovePlaylistTracksHandler(io, socket, services);
  registerUpdatePlaylistTrackHandler(io, socket, services);
}

function registerImportPlaylistHandler(io: Server, socket: Socket, services: RoomServices): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.ImportPlaylist,
    schema: importPlaylistPayloadSchema,
    invalidPayload: {
      code: "INVALID_IMPORT_PLAYLIST_PAYLOAD",
      message: "Playlist URL is invalid.",
    },
    handle: async (data) => {
      const { roomState, resultPayload } = await services.playlists.importPlaylist(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistImportResult, resultPayload);
      if (resultPayload.success) {
        broadcastRoomState(io, roomState);
      }
    },
    failureReply: {
      invalidPayload: () => {
        socket.emit(ServerToClientEvent.PlaylistImportResult, {
          success: false,
          code: "invalid_url",
          message: "Playlist URL is invalid.",
        });
      },
      unexpectedError: () => {
        socket.emit(ServerToClientEvent.PlaylistImportResult, {
          success: false,
          code: "spotify_api_error",
          message: "An unexpected error occurred. Please try again.",
        });
      },
    },
    fallbackErrorCode: "IMPORT_PLAYLIST_FAILED",
    errorMessages: musicSetupErrorMessages,
  });
}

function registerLoadCuratedPlaylistHandler(
  io: Server,
  socket: Socket,
  services: RoomServices,
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
      const { roomState, tracks } = services.playlists.loadCuratedPlaylist(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTracks, { tracks });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "LOAD_CURATED_PLAYLIST_FAILED",
    errorMessages: loadCuratedPlaylistErrorMessages,
  });
}

function registerGetPlaylistTracksHandler(socket: Socket, services: RoomServices): void {
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
      const tracks = services.playlists.getPlaylistTracks(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTracks, { tracks });
    },
    fallbackErrorCode: "GET_PLAYLIST_TRACKS_FAILED",
    errorMessages: getPlaylistTracksErrorMessages,
  });
}

function registerRemovePlaylistTracksHandler(
  io: Server,
  socket: Socket,
  services: RoomServices,
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
      const { roomState, tracks } = services.playlists.removePlaylistTracks(data, socket.id);
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
  services: RoomServices,
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
      const { roomState, track } = services.playlists.updatePlaylistTrack(data, socket.id);
      socket.emit(ServerToClientEvent.PlaylistTrackUpdated, { track });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "UPDATE_PLAYLIST_TRACK_FAILED",
    errorMessages: updatePlaylistTrackErrorMessages,
  });
}
