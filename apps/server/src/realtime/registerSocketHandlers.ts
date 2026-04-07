import {
  ClientToServerEvent,
  ServerToClientEvent,
  confirmRevealPayloadSchema,
  joinRoomPayloadSchema,
  placeCardPayloadSchema,
  startGamePayloadSchema,
  updatePlayerSettingsPayloadSchema,
  updateRoomSettingsPayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../app/logger.js";
import type { RoomService } from "../rooms/RoomService.js";

export function registerSocketHandlers(io: Server, roomService: RoomService): void {
  roomService.setRoomStateChangedListener((roomState) => {
    io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
      roomState,
    });
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");
    registerJoinRoomHandler(io, socket, roomService);
    registerStartGameHandler(io, socket, roomService);
    registerPlaceCardHandler(io, socket, roomService);
    registerConfirmRevealHandler(io, socket, roomService);
    registerUpdateRoomSettingsHandler(io, socket, roomService);
    registerUpdatePlayerSettingsHandler(io, socket, roomService);
    registerDisconnectHandler(io, socket, roomService);
  });
}

function registerJoinRoomHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.JoinRoom, (payload: unknown) => {
    const parseResult = joinRoomPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_JOIN_ROOM_PAYLOAD",
        message: "Room code or display name is invalid.",
      });
      return;
    }

    try {
      const { playerId, roomState } = roomService.joinRoom(
        parseResult.data,
        socket.id,
      );
      socket.join(roomState.roomId);
      socket.emit(ServerToClientEvent.PlayerIdentity, { playerId });

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "JOIN_ROOM_FAILED", {
        GAME_ALREADY_STARTED: "This game has already started.",
      });
    }
  });
}

function registerStartGameHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.StartGame, (payload: unknown) => {
    const parseResult = startGamePayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.startGame(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "START_GAME_FAILED", {
        GAME_ALREADY_STARTED: "This game has already started.",
        NOT_ENOUGH_CARDS: "There are not enough cards to start this game.",
        ONLY_HOST_CAN_START_GAME: "Only the host can start the game.",
      });
    }
  });
}

function registerPlaceCardHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.PlaceCard, (payload: unknown) => {
    const parseResult = placeCardPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_PLACE_CARD_PAYLOAD",
        message: "Selected timeline slot is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.placeCard(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "PLACE_CARD_FAILED", {
        GAME_NOT_IN_TURN_PHASE: "Cards can only be placed during a turn.",
        GAME_NOT_STARTED: "The game has not started yet.",
        INVALID_SLOT_INDEX: "Selected timeline slot is invalid.",
        NOT_ACTIVE_PLAYER: "It is not your turn.",
      });
    }
  });
}

function registerConfirmRevealHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.ConfirmReveal, (payload: unknown) => {
    const parseResult = confirmRevealPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_CONFIRM_REVEAL_PAYLOAD",
        message: "Room code is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.confirmReveal(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "CONFIRM_REVEAL_FAILED", {
        GAME_NOT_IN_REVEAL_PHASE: "Reveal can only be confirmed after a placement.",
        GAME_NOT_STARTED: "The game has not started yet.",
        ONLY_HOST_CAN_CONFIRM_REVEAL: "Only the host can confirm the reveal.",
        ONLY_HOST_OR_ACTIVE_PLAYER_CAN_CONFIRM_REVEAL:
          "Only the host or active player can confirm the reveal.",
      });
    }
  });
}

function registerUpdatePlayerSettingsHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.UpdatePlayerSettings, (payload: unknown) => {
    const parseResult = updatePlayerSettingsPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_PLAYER_SETTINGS_PAYLOAD",
        message: "Player starting-card count is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.updatePlayerSettings(
        parseResult.data,
        socket.id,
      );

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "PLAYER_SETTINGS_UPDATE_FAILED", {
        ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS:
          "Only the host can change player settings.",
      });
    }
  });
}

function registerUpdateRoomSettingsHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.UpdateRoomSettings, (payload: unknown) => {
    const parseResult = updateRoomSettingsPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_ROOM_SETTINGS_PAYLOAD",
        message: "Target card count must stay within the allowed range.",
      });
      return;
    }

    try {
      const roomState = roomService.updateRoomSettings(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "ROOM_SETTINGS_UPDATE_FAILED", {
        ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS:
          "Only the host can change room settings.",
      });
    }
  });
}

function emitServerError(
  socket: Socket,
  error: unknown,
  fallbackCode: string,
  messageByCode: Record<string, string>,
): void {
  const errorCode = error instanceof Error ? error.message : fallbackCode;

  socket.emit(ServerToClientEvent.Error, {
    code: errorCode,
    message:
      messageByCode[errorCode] ??
      "The requested room action could not be completed.",
  });
}

function registerDisconnectHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "socket disconnected");

    const roomState = roomService.removePlayer(socket.id);

    if (roomState) {
      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    }
  });
}
