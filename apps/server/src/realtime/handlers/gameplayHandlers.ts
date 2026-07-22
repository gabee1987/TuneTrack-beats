import {
  ClientToServerEvent,
  awardTtPayloadSchema,
  buyTimelineCardWithTtPayloadSchema,
  claimChallengePayloadSchema,
  confirmRevealPayloadSchema,
  placeChallengePayloadSchema,
  placeCardPayloadSchema,
  resolveChallengeWindowPayloadSchema,
  skipTrackWithTtPayloadSchema,
  skipTurnPayloadSchema,
  startGamePayloadSchema,
} from "@tunetrack/shared";
import type { Server, Socket } from "socket.io";
import { logger } from "../../app/logger.js";
import type { RoomService } from "../../rooms/RoomService.js";
import { broadcastRoomState, createSocketHandler } from "../createSocketHandler.js";
import {
  awardTtErrorMessages,
  buyTimelineCardWithTtErrorMessages,
  claimChallengeErrorMessages,
  confirmRevealErrorMessages,
  placeCardErrorMessages,
  placeChallengeErrorMessages,
  resolveChallengeWindowErrorMessages,
  skipTrackWithTtErrorMessages,
  skipTurnErrorMessages,
  startGameErrorMessages,
} from "../errorMessages.js";

export function registerGameplayHandlers(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  registerStartGameHandler(io, socket, roomService);
  registerPlaceCardHandler(io, socket, roomService);
  registerConfirmRevealHandler(io, socket, roomService);
  registerClaimChallengeHandler(io, socket, roomService);
  registerPlaceChallengeHandler(io, socket, roomService);
  registerResolveChallengeWindowHandler(io, socket, roomService);
  registerAwardTtHandler(io, socket, roomService);
  registerSkipTrackWithTtHandler(io, socket, roomService);
  registerSkipTurnHandler(io, socket, roomService);
  registerBuyTimelineCardWithTtHandler(io, socket, roomService);
}

function registerStartGameHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.StartGame,
    schema: startGamePayloadSchema,
    invalidPayload: {
      code: "INVALID_START_GAME_PAYLOAD",
      message: "Room code is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "start_game");
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.startGame(data, socket.id));
    },
    fallbackErrorCode: "START_GAME_FAILED",
    errorMessages: startGameErrorMessages,
  });
}

function registerPlaceCardHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.PlaceCard,
    schema: placeCardPayloadSchema,
    invalidPayload: {
      code: "INVALID_PLACE_CARD_PAYLOAD",
      message: "Selected timeline slot is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          selectedSlotIndex: data.selectedSlotIndex,
        },
        "place_card",
      );
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.placeCard(data, socket.id));
    },
    fallbackErrorCode: "PLACE_CARD_FAILED",
    errorMessages: placeCardErrorMessages,
  });
}

function registerConfirmRevealHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.ConfirmReveal,
    schema: confirmRevealPayloadSchema,
    invalidPayload: {
      code: "INVALID_CONFIRM_REVEAL_PAYLOAD",
      message: "Room code is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "confirm_reveal");
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.confirmReveal(data, socket.id));
    },
    fallbackErrorCode: "CONFIRM_REVEAL_FAILED",
    errorMessages: confirmRevealErrorMessages,
  });
}

function registerClaimChallengeHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.ClaimChallenge,
    schema: claimChallengePayloadSchema,
    invalidPayload: {
      code: "INVALID_CLAIM_CHALLENGE_PAYLOAD",
      message: "Room code is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "claim_challenge");
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.claimChallenge(data, socket.id));
    },
    fallbackErrorCode: "CLAIM_CHALLENGE_FAILED",
    errorMessages: claimChallengeErrorMessages,
  });
}

function registerPlaceChallengeHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.PlaceChallenge,
    schema: placeChallengePayloadSchema,
    invalidPayload: {
      code: "INVALID_PLACE_CHALLENGE_PAYLOAD",
      message: "Selected timeline slot is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          selectedSlotIndex: data.selectedSlotIndex,
        },
        "place_challenge",
      );
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.placeChallenge(data, socket.id));
    },
    fallbackErrorCode: "PLACE_CHALLENGE_FAILED",
    errorMessages: placeChallengeErrorMessages,
  });
}

function registerResolveChallengeWindowHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.ResolveChallengeWindow,
    schema: resolveChallengeWindowPayloadSchema,
    invalidPayload: {
      code: "INVALID_RESOLVE_CHALLENGE_WINDOW_PAYLOAD",
      message: "Room code is invalid.",
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.resolveChallengeWindow(data, socket.id));
    },
    fallbackErrorCode: "RESOLVE_CHALLENGE_WINDOW_FAILED",
    errorMessages: resolveChallengeWindowErrorMessages,
  });
}

function registerAwardTtHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.AwardTt,
    schema: awardTtPayloadSchema,
    invalidPayload: {
      code: "INVALID_AWARD_TT_PAYLOAD",
      message: "TT award payload is invalid.",
    },
    log: (data) => {
      logger.info(
        {
          socketId: socket.id,
          roomId: data.roomId,
          targetPlayerId: data.playerId,
          amount: data.amount,
        },
        "award_tt",
      );
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.awardTt(data, socket.id));
    },
    fallbackErrorCode: "AWARD_TT_FAILED",
    errorMessages: awardTtErrorMessages,
  });
}

function registerSkipTrackWithTtHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.SkipTrackWithTt,
    schema: skipTrackWithTtPayloadSchema,
    invalidPayload: {
      code: "INVALID_SKIP_TRACK_WITH_TT_PAYLOAD",
      message: "Skip request payload is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "skip_track_with_tt");
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.skipTrackWithTt(data, socket.id));
    },
    fallbackErrorCode: "SKIP_TRACK_WITH_TT_FAILED",
    errorMessages: skipTrackWithTtErrorMessages,
  });
}

function registerSkipTurnHandler(io: Server, socket: Socket, roomService: RoomService): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.SkipTurn,
    schema: skipTurnPayloadSchema,
    invalidPayload: {
      code: "INVALID_SKIP_TURN_PAYLOAD",
      message: "Skip turn request payload is invalid.",
    },
    log: (data) => {
      logger.info({ socketId: socket.id, roomId: data.roomId }, "skip_turn");
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.skipTurn(data, socket.id));
    },
    fallbackErrorCode: "SKIP_TURN_FAILED",
    errorMessages: skipTurnErrorMessages,
  });
}

function registerBuyTimelineCardWithTtHandler(
  io: Server,
  socket: Socket,
  roomService: RoomService,
): void {
  createSocketHandler({
    socket,
    event: ClientToServerEvent.BuyTimelineCardWithTt,
    schema: buyTimelineCardWithTtPayloadSchema,
    invalidPayload: {
      code: "INVALID_BUY_TIMELINE_CARD_WITH_TT_PAYLOAD",
      message: "Buy-card request payload is invalid.",
    },
    handle: (data) => {
      broadcastRoomState(io, roomService.buyTimelineCardWithTt(data, socket.id));
    },
    fallbackErrorCode: "BUY_TIMELINE_CARD_WITH_TT_FAILED",
    errorMessages: buyTimelineCardWithTtErrorMessages,
  });
}
