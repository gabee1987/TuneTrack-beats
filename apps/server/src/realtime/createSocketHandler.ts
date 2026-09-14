import { randomUUID } from "node:crypto";
import { ServerToClientEvent, type ActionAck, type PublicRoomState } from "@tunetrack/shared";
import type { z } from "zod";
import type { Server, Socket } from "socket.io";
import { logger } from "../app/logger.js";
import { resolveSocketErrorMessage } from "./errorMessages.js";
import { logRejectedSocketEvent } from "./realtimeAuditLogger.js";

export function emitServerError(
  socket: Socket,
  eventName: string,
  error: unknown,
  fallbackCode: string,
  messageByCode: Record<string, string>,
): string {
  const errorCode = error instanceof Error ? error.message : fallbackCode;
  logger.warn(
    { socketId: socket.id, event: eventName, code: errorCode },
    "socket action rejected",
  );
  logRejectedSocketEvent(socket, eventName, errorCode);

  socket.emit(ServerToClientEvent.Error, {
    code: errorCode,
    message: resolveSocketErrorMessage(errorCode, messageByCode),
  });
  return errorCode;
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
  idempotency?: {
    find: (parsed: z.output<TSchema>) => ActionAck | undefined;
    remember: (parsed: z.output<TSchema>, ack: ActionAck) => void;
  };
};

export function createSocketHandler<TSchema extends z.ZodTypeAny>(
  options: CreateSocketHandlerOptions<TSchema>,
): void {
  options.socket.on(options.event, (payload: unknown, ack?: (response: ActionAck) => void) => {
    const requestId = getActionRequestId(payload);
    const parseResult = options.schema.safeParse(payload);

    if (!parseResult.success) {
      ack?.({
        ok: false,
        requestId,
        code: options.invalidPayload.code,
      });
      options.socket.emit(ServerToClientEvent.Error, {
        code: options.invalidPayload.code,
        message: options.invalidPayload.message,
      });
      return;
    }

    try {
      const replayAck = options.idempotency?.find(parseResult.data);
      if (replayAck) {
        ack?.(replayAck);
        return;
      }

      options.log?.(parseResult.data);
      options.handle(parseResult.data);
      const successAck = { ok: true, requestId } satisfies ActionAck;
      options.idempotency?.remember(parseResult.data, successAck);
      ack?.(successAck);
    } catch (error) {
      const errorCode = emitServerError(
        options.socket,
        options.event,
        error,
        options.fallbackErrorCode,
        options.errorMessages,
      );
      ack?.({ ok: false, requestId, code: errorCode });
    }
  });
}

function getActionRequestId(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const requestId = (payload as { requestId?: unknown }).requestId;
    if (typeof requestId === "string" && requestId.length > 0) {
      return requestId;
    }
  }

  return randomUUID();
}
