import type { PublicRoomState, RoomId } from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import type { JoinRoomResult } from "./RoomStore.js";

export function logRoomCreated(result: JoinRoomResult, displayName: string): void {
  logger.info(
    { roomId: result.roomState.roomId, playerId: result.playerId, displayName },
    "room created",
  );
}

export function logPlayerJoined(result: JoinRoomResult, displayName: string): void {
  logger.info(
    {
      roomId: result.roomState.roomId,
      playerId: result.playerId,
      displayName,
      playerCount: result.roomState.players.length,
    },
    "player joined room",
  );
}

export function logPlayerLeft(socketId: string, roomState: PublicRoomState): void {
  logger.info(
    {
      socketId,
      roomId: roomState.roomId,
      playerCount: roomState.players.length,
      gameStatus: roomState.status,
    },
    "player left room",
  );
}

export function logGameStarted(
  roomState: PublicRoomState,
  deckSize: number,
  usingImportedDeck: boolean,
): void {
  logger.info(
    {
      roomId: roomState.roomId,
      deckSize,
      usingImportedDeck,
      playerCount: roomState.players.length,
    },
    "game started",
  );
}

export function logTurnProgress(roomState: PublicRoomState): void {
  const turn = {
    turnNumber: roomState.turn?.turnNumber,
    activePlayerId: roomState.turn?.activePlayerId,
  };
  if (roomState.winnerPlayerId) {
    logger.info({ roomId: roomState.roomId, winnerPlayerId: roomState.winnerPlayerId }, "game won");
  } else if (roomState.status === "challenge") {
    logger.info({ roomId: roomState.roomId, ...turn }, "challenge window opened");
  } else if (roomState.status === "turn") {
    logger.info({ roomId: roomState.roomId, ...turn }, "next turn");
  }
}

export function logRoomRenamed(previousRoomId: RoomId, nextRoomId: RoomId, socketId: string): void {
  logger.info({ nextRoomId, previousRoomId, socketId }, "room renamed");
}

export function logRoomClosed(roomId: RoomId, socketId: string): void {
  logger.info({ roomId, socketId }, "room closed");
}
