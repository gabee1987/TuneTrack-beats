import {
  ClientToServerEvent,
  ServerToClientEvent,
  awardTtPayloadSchema,
  buyTimelineCardWithTtPayloadSchema,
  claimChallengePayloadSchema,
  closeRoomPayloadSchema,
  confirmRevealPayloadSchema,
  joinRoomPayloadSchema,
  placeChallengePayloadSchema,
  placeCardPayloadSchema,
  resolveChallengeWindowPayloadSchema,
  skipTrackWithTtPayloadSchema,
  startGamePayloadSchema,
  updatePlayerProfilePayloadSchema,
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
    registerClaimChallengeHandler(io, socket, roomService);
    registerPlaceChallengeHandler(io, socket, roomService);
    registerResolveChallengeWindowHandler(io, socket, roomService);
    registerAwardTtHandler(io, socket, roomService);
    registerSkipTrackWithTtHandler(io, socket, roomService);
    registerBuyTimelineCardWithTtHandler(io, socket, roomService);
    registerConfirmRevealHandler(io, socket, roomService);
    registerCloseRoomHandler(io, socket, roomService);
    registerUpdateRoomSettingsHandler(io, socket, roomService);
    registerUpdatePlayerSettingsHandler(io, socket, roomService);
    registerUpdatePlayerProfileHandler(io, socket, roomService);
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

function registerClaimChallengeHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.ClaimChallenge, (payload: unknown) => {
    const parseResult = claimChallengePayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_CLAIM_CHALLENGE_PAYLOAD",
        message: "Room code is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.claimChallenge(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "CLAIM_CHALLENGE_FAILED", {
        ACTIVE_PLAYER_CANNOT_CHALLENGE: "The active player cannot use Beat! on their own turn.",
        CHALLENGE_ALREADY_CLAIMED: "Another player already claimed Beat! first.",
        CHALLENGE_WINDOW_EXPIRED: "The Beat! window already expired.",
        GAME_NOT_IN_CHALLENGE_PHASE: "Beat! is only available during the challenge window.",
        INSUFFICIENT_TT: "You need at least 1 TT to use Beat!.",
      });
    }
  });
}

function registerPlaceChallengeHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.PlaceChallenge, (payload: unknown) => {
    const parseResult = placeChallengePayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_PLACE_CHALLENGE_PAYLOAD",
        message: "Selected timeline slot is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.placeChallenge(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "PLACE_CHALLENGE_FAILED", {
        CHALLENGE_WINDOW_EXPIRED:
          "The Beat! window already expired.",
        GAME_NOT_IN_CHALLENGE_PHASE: "Challenge placement is only available during the challenge window.",
        INVALID_SLOT_INDEX: "Selected timeline slot is invalid.",
        CHALLENGE_SLOT_MUST_DIFFER:
          "Beat! must point to a different slot than the original choice.",
        ONLY_CHALLENGE_OWNER_CAN_PLACE:
          "Only the player who claimed Beat! can place the challenge slot.",
      });
    }
  });
}

function registerResolveChallengeWindowHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.ResolveChallengeWindow, (payload: unknown) => {
    const parseResult = resolveChallengeWindowPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_RESOLVE_CHALLENGE_WINDOW_PAYLOAD",
        message: "Room code is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.resolveChallengeWindow(
        parseResult.data,
        socket.id,
      );

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "RESOLVE_CHALLENGE_WINDOW_FAILED", {
        CHALLENGE_ALREADY_CLAIMED:
          "The challenge window is already claimed and cannot be resolved yet.",
        GAME_NOT_IN_CHALLENGE_PHASE: "Challenge resolution is only available during the challenge window.",
        ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW:
          "Only the host can manually resolve the challenge window.",
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

function registerUpdatePlayerProfileHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.UpdatePlayerProfile, (payload: unknown) => {
    const parseResult = updatePlayerProfilePayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_PLAYER_PROFILE_PAYLOAD",
        message: "Player name is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.updatePlayerProfile(
        parseResult.data,
        socket.id,
      );

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "PLAYER_PROFILE_UPDATE_FAILED", {
        GAME_ALREADY_STARTED: "Names can only be changed before the game starts.",
      });
    }
  });
}

function registerAwardTtHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.AwardTt, (payload: unknown) => {
    const parseResult = awardTtPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_AWARD_TT_PAYLOAD",
        message: "TT award payload is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.awardTt(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "AWARD_TT_FAILED", {
        ONLY_HOST_CAN_AWARD_TT: "Only the host can award TT.",
        PLAYER_NOT_FOUND: "That player is no longer in the room.",
        INVALID_TT_AMOUNT: "TT award amount is invalid.",
      });
    }
  });
}

function registerSkipTrackWithTtHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.SkipTrackWithTt, (payload: unknown) => {
    const parseResult = skipTrackWithTtPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_SKIP_TRACK_WITH_TT_PAYLOAD",
        message: "Skip request payload is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.skipTrackWithTt(parseResult.data, socket.id);

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "SKIP_TRACK_WITH_TT_FAILED", {
        GAME_NOT_IN_TURN_PHASE: "You can only skip on your own turn.",
        GAME_NOT_STARTED: "The game has not started yet.",
        INSUFFICIENT_TT: "You need at least 1 TT to skip.",
        NOT_ENOUGH_CARDS: "The deck is empty, so this track cannot be skipped.",
        NOT_ACTIVE_PLAYER: "Only the active player can skip the current track.",
        SKIP_ALREADY_USED_THIS_TURN:
          "You already used your one allowed skip on this turn.",
        TT_MODE_DISABLED: "TT mode is disabled in this room.",
      });
    }
  });
}

function registerBuyTimelineCardWithTtHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.BuyTimelineCardWithTt, (payload: unknown) => {
    const parseResult = buyTimelineCardWithTtPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_BUY_TIMELINE_CARD_WITH_TT_PAYLOAD",
        message: "Buy-card request payload is invalid.",
      });
      return;
    }

    try {
      const roomState = roomService.buyTimelineCardWithTt(
        parseResult.data,
        socket.id,
      );

      io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
        roomState,
      });
    } catch (error) {
      emitServerError(socket, error, "BUY_TIMELINE_CARD_WITH_TT_FAILED", {
        GAME_NOT_IN_TURN_PHASE: "You can only buy a card on your own turn.",
        GAME_NOT_STARTED: "The game has not started yet.",
        INSUFFICIENT_TT: "You need at least 3 TT to buy a card.",
        NOT_ENOUGH_CARDS: "The deck is empty, so no card can be bought.",
        NOT_ACTIVE_PLAYER: "Only the active player can buy a timeline card.",
        TT_MODE_DISABLED: "TT mode is disabled in this room.",
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

function registerCloseRoomHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  socket.on(ClientToServerEvent.CloseRoom, (payload: unknown) => {
    const parseResult = closeRoomPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      socket.emit(ServerToClientEvent.Error, {
        code: "INVALID_CLOSE_ROOM_PAYLOAD",
        message: "Room code is invalid.",
      });
      return;
    }

    try {
      const roomId = roomService.closeRoom(parseResult.data, socket.id);

      io.to(roomId).emit(ServerToClientEvent.RoomClosed, {
        roomId,
        message: "The host closed this room.",
      });
      io.in(roomId).socketsLeave(roomId);
    } catch (error) {
      emitServerError(socket, error, "CLOSE_ROOM_FAILED", {
        ONLY_HOST_CAN_CLOSE_ROOM: "Only the host can close the room.",
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
