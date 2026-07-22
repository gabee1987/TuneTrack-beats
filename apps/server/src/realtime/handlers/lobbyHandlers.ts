import {
  ClientToServerEvent,
  ServerToClientEvent,
  closeRoomPayloadSchema,
  createRoomPayloadSchema,
  getRoomPreviewPayloadSchema,
  joinRoomPayloadSchema,
  kickPlayerPayloadSchema,
  renameRoomPayloadSchema,
  transferHostPayloadSchema,
  updatePlayerProfilePayloadSchema,
  updatePlayerSettingsPayloadSchema,
  updateRoomSettingsPayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../../app/logger.js";
import type { RoomService } from "../../rooms/RoomService.js";
import { broadcastRoomState, createSocketHandler } from "../createSocketHandler.js";
import {
  closeRoomErrorMessages,
  createRoomErrorMessages,
  joinRoomErrorMessages,
  kickPlayerErrorMessages,
  playerProfileErrorMessages,
  playerSettingsErrorMessages,
  renameRoomErrorMessages,
  roomSettingsErrorMessages,
  transferHostErrorMessages,
} from "../errorMessages.js";

export function registerLobbyHandlers(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  registerCreateRoomHandler(io, socket, roomService);
  registerJoinRoomHandler(io, socket, roomService);
  registerListRoomsHandler(socket, roomService);
  registerGetRoomPreviewHandler(socket, roomService);
  registerRenameRoomHandler(io, socket, roomService);
  registerTransferHostHandler(io, socket, roomService);
  registerKickPlayerHandler(io, socket, roomService);
  registerUpdateRoomSettingsHandler(io, socket, roomService);
  registerUpdatePlayerSettingsHandler(io, socket, roomService);
  registerUpdatePlayerProfileHandler(io, socket, roomService);
  registerCloseRoomHandler(io, socket, roomService);
  registerDisconnectHandler(io, socket, roomService);
}

function registerRenameRoomHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.RenameRoom,
    schema: renameRoomPayloadSchema,
    invalidPayload: {
      code: "INVALID_RENAME_ROOM_PAYLOAD",
      message: "Room code is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          nextRoomId: data.nextRoomId,
          previousRoomId: data.roomId,
          socketId: socket.id,
        },
        "rename_room",
      );
    },
    handle: (data) => {
      const { previousRoomId, roomState } = roomService.renameRoom(data, socket.id);

      io.in(previousRoomId).socketsJoin(roomState.roomId);
      io.in(previousRoomId).socketsLeave(previousRoomId);
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "RENAME_ROOM_FAILED",
    errorMessages: renameRoomErrorMessages,
  });
}

function registerJoinRoomHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.JoinRoom,
    schema: joinRoomPayloadSchema,
    invalidPayload: {
      code: "INVALID_JOIN_ROOM_PAYLOAD",
      message: "Room code or display name is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          displayName: data.displayName,
        },
        "join_room",
      );
    },
    handle: (data) => {
      const previousSocketRoomIds = [...socket.rooms].filter((roomId) => roomId !== socket.id);
      const { playerId, roomState } = roomService.joinRoom(data, socket.id);
      for (const previousSocketRoomId of previousSocketRoomIds) {
        if (previousSocketRoomId !== roomState.roomId) {
          socket.leave(previousSocketRoomId);
        }
      }
      socket.join(roomState.roomId);
      socket.emit(ServerToClientEvent.PlayerIdentity, { playerId });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "JOIN_ROOM_FAILED",
    errorMessages: joinRoomErrorMessages,
  });
}

function registerCreateRoomHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.CreateRoom,
    schema: createRoomPayloadSchema,
    invalidPayload: {
      code: "INVALID_CREATE_ROOM_PAYLOAD",
      message: "Room code or display name is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          displayName: data.displayName,
        },
        "create_room",
      );
    },
    handle: (data) => {
      const previousSocketRoomIds = [...socket.rooms].filter((roomId) => roomId !== socket.id);
      const { playerId, roomState } = roomService.createRoom(data, socket.id);
      for (const previousSocketRoomId of previousSocketRoomIds) {
        if (previousSocketRoomId !== roomState.roomId) {
          socket.leave(previousSocketRoomId);
        }
      }
      socket.join(roomState.roomId);
      socket.emit(ServerToClientEvent.PlayerIdentity, { playerId });
      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "CREATE_ROOM_FAILED",
    errorMessages: createRoomErrorMessages,
  });
}

function registerListRoomsHandler(socket: Socket, roomService: RoomService): void {
  socket.on(ClientToServerEvent.ListRooms, () => {
    socket.emit(ServerToClientEvent.RoomList, {
      rooms: roomService.listRooms(),
    });
  });
}

function registerGetRoomPreviewHandler(socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.GetRoomPreview,
    schema: getRoomPreviewPayloadSchema,
    invalidPayload: {
      code: "INVALID_ROOM_PREVIEW_PAYLOAD",
      message: "Room code is invalid.",
    },
    handle: (data) => {
      socket.emit(ServerToClientEvent.RoomPreview, {
        requestedRoomId: data.roomId,
        room: roomService.getRoomPreview(data),
      });
    },
    fallbackErrorCode: "GET_ROOM_PREVIEW_FAILED",
    errorMessages: {},
  });
}

function registerTransferHostHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.TransferHost,
    schema: transferHostPayloadSchema,
    invalidPayload: {
      code: "INVALID_TRANSFER_HOST_PAYLOAD",
      message: "Host transfer target is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          targetPlayerId: data.playerId,
        },
        "transfer_host",
      );
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.transferHost(data, socket.id));
    },
    fallbackErrorCode: "TRANSFER_HOST_FAILED",
    errorMessages: transferHostErrorMessages,
  });
}

function registerKickPlayerHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.KickPlayer,
    schema: kickPlayerPayloadSchema,
    invalidPayload: {
      code: "INVALID_KICK_PLAYER_PAYLOAD",
      message: "Kick player request is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          targetPlayerId: data.playerId,
        },
        "kick_player",
      );
    },
    handle: (data) => {
      const { kickedSocketIds, roomState } = roomService.kickPlayer(data, socket.id);

      for (const kickedSocketId of kickedSocketIds) {
        io.to(kickedSocketId).emit(ServerToClientEvent.RoomClosed, {
          roomId: data.roomId,
          reason: "kicked",
          roomName: data.roomId,
          message: "You were removed from this room.",
        });
        io.in(kickedSocketId).socketsLeave(data.roomId);
      }

      broadcastRoomState(io, roomState);
    },
    fallbackErrorCode: "KICK_PLAYER_FAILED",
    errorMessages: kickPlayerErrorMessages,
  });
}

function registerUpdatePlayerSettingsHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.UpdatePlayerSettings,
    schema: updatePlayerSettingsPayloadSchema,
    invalidPayload: {
      code: "INVALID_PLAYER_SETTINGS_PAYLOAD",
      message: "Player starting-card count is invalid.",
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.updatePlayerSettings(data, socket.id));
    },
    fallbackErrorCode: "PLAYER_SETTINGS_UPDATE_FAILED",
    errorMessages: playerSettingsErrorMessages,
  });
}

function registerUpdatePlayerProfileHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.UpdatePlayerProfile,
    schema: updatePlayerProfilePayloadSchema,
    invalidPayload: {
      code: "INVALID_PLAYER_PROFILE_PAYLOAD",
      message: "Player name is invalid.",
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.updatePlayerProfile(data, socket.id));
    },
    fallbackErrorCode: "PLAYER_PROFILE_UPDATE_FAILED",
    errorMessages: playerProfileErrorMessages,
  });
}

function registerUpdateRoomSettingsHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.UpdateRoomSettings,
    schema: updateRoomSettingsPayloadSchema,
    invalidPayload: {
      code: "INVALID_ROOM_SETTINGS_PAYLOAD",
      message: "Target card count must stay within the allowed range.",
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.updateRoomSettings(data, socket.id));
    },
    fallbackErrorCode: "ROOM_SETTINGS_UPDATE_FAILED",
    errorMessages: roomSettingsErrorMessages,
  });
}

function registerCloseRoomHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.CloseRoom,
    schema: closeRoomPayloadSchema,
    invalidPayload: {
      code: "INVALID_CLOSE_ROOM_PAYLOAD",
      message: "Room code is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "close_room");
    },
    handle: (data) => {
      const roomId = roomService.closeRoom(data, socket.id);

      io.to(roomId).emit(ServerToClientEvent.RoomClosed, {
        roomId,
        message: "The host closed this room.",
      });
      io.in(roomId).socketsLeave(roomId);
    },
    fallbackErrorCode: "CLOSE_ROOM_FAILED",
    errorMessages: closeRoomErrorMessages,
  });
}

function registerDisconnectHandler(io: Server, socket: Socket, roomService: RoomService): void {
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "socket disconnected");

    const roomState = roomService.removePlayer(socket.id);

    if (roomState) {
      broadcastRoomState(io, roomState);
    }
  });
}
