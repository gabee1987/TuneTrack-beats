import { ServerToClientEvent, type PublicRoomState } from "@tunetrack/shared";
import type { z } from "zod";
import type { Server, Socket } from "socket.io";
import { logger } from "../app/logger.js";
import { resolveSocketErrorMessage } from "./errorMessages.js";
import { logRejectedCurrentSocketEvent } from "./realtimeAuditLogger.js";

export function emitServerError(
  socket: Socket,
  error: unknown,
  fallbackCode: string,
  messageByCode: Record<string, string>,
): void {
  const errorCode = error instanceof Error ? error.message : fallbackCode;
  logger.warn({ socketId: socket.id, code: errorCode }, "socket action rejected");
  logRejectedCurrentSocketEvent(socket, errorCode);

  socket.emit(ServerToClientEvent.Error, {
    code: errorCode,
    message: resolveSocketErrorMessage(errorCode, messageByCode),
  });
}

export function broadcastRoomState(io: Server, roomState: PublicRoomState): void {
  io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
    roomState,
  });
}

type CreateSocketHandlerOptions<TSchema extends z.ZodTypeAny> = {
  socket: Socket;
  event: string;
  schema: TSchema;
  invalidPayload: {
    code: string;
    message: string;
  };
  log?: (parsed: z.output<TSchema>) => void;
  handle: (parsed: z.output<TSchema>) => void;
  fallbackErrorCode: string;
  errorMessages: Record<string, string>;
};

export function createSocketHandler<TSchema extends z.ZodTypeAny>(
  options: CreateSocketHandlerOptions<TSchema>,
): void {
  options.socket.on(options.event, (payload: unknown) => {
    const parseResult = options.schema.safeParse(payload);

    if (!parseResult.success) {
      options.socket.emit(ServerToClientEvent.Error, {
        code: options.invalidPayload.code,
        message: options.invalidPayload.message,
      });
      return;
    }

    options.log?.(parseResult.data);

    try {
      options.handle(parseResult.data);
    } catch (error) {
      emitServerError(
        options.socket,
        error,
        options.fallbackErrorCode,
        options.errorMessages,
      );
    }
  });
}
