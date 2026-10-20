import {
  type ActionAck,
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
import type { RoomServices } from "../../app/createRoomServices.js";
import { broadcastRoomDirectory } from "../broadcastRoomDirectory.js";
import { broadcastRoomState, createSocketHandler } from "../createSocketHandler.js";
import { settleAuditedSocketEvent } from "../realtimeAuditLogger.js";
import { roomActionIdempotency } from "../roomActionIdempotency.js";
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

export function registerLobbyHandlers(io: Server, socket: Socket, services: RoomServices): void {
  registerCreateRoomHandler(io, socket, services);
  registerJoinRoomHandler(io, socket, services);
  registerListRoomsHandler(socket, services);
  registerGetRoomPreviewHandler(socket, services);
  registerRenameRoomHandler(io, socket, services);
  registerTransferHostHandler(io, socket, services);
  registerKickPlayerHandler(io, socket, services);
  registerUpdateRoomSettingsHandler(io, socket, services);
  registerUpdatePlayerSettingsHandler(io, socket, services);
  registerUpdatePlayerProfileHandler(io, socket, services);
  registerCloseRoomHandler(io, socket, services);
  registerDisconnectHandler(io, socket, services);
}

function registerRenameRoomHandler(io: Server, socket: Socket, services: RoomServices): void {
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
      const { previousRoomId, roomState } = services.lobby.renameRoom(socket.id, data);

      io.in(previousRoomId).socketsJoin(roomState.roomId);
      io.in(previousRoomId).socketsLeave(previousRoomId);
      broadcastRoomState(io, roomState);
      broadcastRoomDirectory(io, services);
    },
    idempotency: roomActionIdempotency(services, socket, ClientToServerEvent.RenameRoom),
    fallbackErrorCode: "RENAME_ROOM_FAILED",
    errorMessages: renameRoomErrorMessages,
  });
}

function registerJoinRoomHandler(io: Server, socket: Socket, services: RoomServices): void {
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
      const { playerId, roomState } = services.lobby.addPlayerToRoom(
        data.roomId,
        data.displayName,
        socket.id,
        data.sessionId,
      );
      for (const previousSocketRoomId of previousSocketRoomIds) {
        if (previousSocketRoomId !== roomState.roomId) {
          socket.leave(previousSocketRoomId);
        }
      }
      socket.join(roomState.roomId);
      socket.emit(ServerToClientEvent.PlayerIdentity, { playerId });
      broadcastRoomState(io, roomState);
      broadcastRoomDirectory(io, services);
    },
    fallbackErrorCode: "JOIN_ROOM_FAILED",
    errorMessages: joinRoomErrorMessages,
  });
}

function registerCreateRoomHandler(io: Server, socket: Socket, services: RoomServices): void {
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
      const { playerId, roomState } = services.lobby.createRoom(
        data.roomId,
        data.displayName,
        socket.id,
        data.sessionId,
      );
      for (const previousSocketRoomId of previousSocketRoomIds) {
        if (previousSocketRoomId !== roomState.roomId) {
          socket.leave(previousSocketRoomId);
        }
      }
      socket.join(roomState.roomId);
      socket.emit(ServerToClientEvent.PlayerIdentity, { playerId });
      broadcastRoomState(io, roomState);
      broadcastRoomDirectory(io, services);
    },
    fallbackErrorCode: "CREATE_ROOM_FAILED",
    errorMessages: createRoomErrorMessages,
  });
}

function registerListRoomsHandler(socket: Socket, services: RoomServices): void {
  socket.on(ClientToServerEvent.ListRooms, () => {
    settleAuditedSocketEvent(socket, ClientToServerEvent.ListRooms);
    socket.emit(ServerToClientEvent.RoomList, {
      rooms: services.store.listLobbySummaries(),
    });
  });
}

function registerGetRoomPreviewHandler(socket: Socket, services: RoomServices): void {
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
        room: services.store.getLobbySummary(data.roomId),
      });
    },
    fallbackErrorCode: "GET_ROOM_PREVIEW_FAILED",
    errorMessages: {},
  });
}

function registerTransferHostHandler(io: Server, socket: Socket, services: RoomServices): void {
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
      broadcastRoomState(io, services.connection.transferHost(socket.id, data));
      broadcastRoomDirectory(io, services);
    },
    idempotency: roomActionIdempotency(services, socket, ClientToServerEvent.TransferHost),
    fallbackErrorCode: "TRANSFER_HOST_FAILED",
    errorMessages: transferHostErrorMessages,
  });
}

function registerKickPlayerHandler(io: Server, socket: Socket, services: RoomServices): void {
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
      const { kickedSocketIds, roomState } = services.connection.kickPlayer(socket.id, data);

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
      broadcastRoomDirectory(io, services);
    },
    idempotency: roomActionIdempotency(services, socket, ClientToServerEvent.KickPlayer),
    fallbackErrorCode: "KICK_PLAYER_FAILED",
    errorMessages: kickPlayerErrorMessages,
  });
}

function registerUpdatePlayerSettingsHandler(
  io: Server,
  socket: Socket,
  services: RoomServices,
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
      broadcastRoomState(io, services.lobby.updatePlayerSettings(socket.id, data));
    },
    fallbackErrorCode: "PLAYER_SETTINGS_UPDATE_FAILED",
    errorMessages: playerSettingsErrorMessages,
  });
}

function registerUpdatePlayerProfileHandler(
  io: Server,
  socket: Socket,
  services: RoomServices,
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
      broadcastRoomState(io, services.lobby.updatePlayerProfile(socket.id, data));
      broadcastRoomDirectory(io, services);
    },
    fallbackErrorCode: "PLAYER_PROFILE_UPDATE_FAILED",
    errorMessages: playerProfileErrorMessages,
  });
}

function registerUpdateRoomSettingsHandler(
  io: Server,
  socket: Socket,
  services: RoomServices,
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
      broadcastRoomState(io, services.lobby.updateRoomSettings(socket.id, data.roomId, data));
    },
    fallbackErrorCode: "ROOM_SETTINGS_UPDATE_FAILED",
    errorMessages: roomSettingsErrorMessages,
  });
}

function registerCloseRoomHandler(io: Server, socket: Socket, services: RoomServices): void {
  // Closing deletes the room and every membership, so the room-scoped ack store cannot hold
  // this ack; a per-socket replay is already limited to the caller.
  let lastSuccessfulClose: { roomId: string; requestId: string; ack: ActionAck } | undefined;

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
      const roomId = services.lobby.closeRoom(socket.id, data);

      io.to(roomId).emit(ServerToClientEvent.RoomClosed, {
        roomId,
        message: "The host closed this room.",
      });
      io.in(roomId).socketsLeave(roomId);
      broadcastRoomDirectory(io, services);
    },
    idempotency: {
      find: (data) =>
        data.requestId &&
        lastSuccessfulClose?.roomId === data.roomId &&
        lastSuccessfulClose.requestId === data.requestId
          ? lastSuccessfulClose.ack
          : undefined,
      remember: (data, ack) => {
        if (data.requestId) {
          lastSuccessfulClose = { roomId: data.roomId, requestId: data.requestId, ack };
        }
      },
    },
    fallbackErrorCode: "CLOSE_ROOM_FAILED",
    errorMessages: closeRoomErrorMessages,
  });
}

function registerDisconnectHandler(io: Server, socket: Socket, services: RoomServices): void {
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "socket disconnected");

    const roomState = services.connection.removePlayerBySocketId(socket.id);

    if (roomState) {
      broadcastRoomState(io, roomState);
    }
  });
}
