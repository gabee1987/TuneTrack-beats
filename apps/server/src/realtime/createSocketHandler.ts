import { randomUUID } from "node:crypto";
import { GameRuleError } from "@tunetrack/game-engine";
import {
  DomainError,
  ServerToClientEvent,
  type ActionAck,
  type PublicRoomState,
  type ServerErrorCode,
} from "@tunetrack/shared";
import type { z } from "zod";
import type { Server, Socket } from "socket.io";
import { logger } from "../app/logger.js";
import { resolveSocketErrorMessage, type SocketErrorMessages } from "./errorMessages.js";
import { logRejectedSocketEvent, settleAuditedSocketEvent } from "./realtimeAuditLogger.js";

export function emitServerError(
  socket: Socket,
  eventName: string,
  error: unknown,
  fallbackCode: ServerErrorCode,
  messageByCode: SocketErrorMessages,
): ServerErrorCode {
  const errorCode = reportServerError(socket, eventName, error, fallbackCode);
  socket.emit(ServerToClientEvent.Error, {
    code: errorCode,
    message: resolveSocketErrorMessage(errorCode, messageByCode),
  });
  return errorCode;
}

function reportServerError(
  socket: Socket,
  eventName: string,
  error: unknown,
  fallbackCode: ServerErrorCode,
): ServerErrorCode {
  const domainErrorCode = resolveDomainErrorCode(error);
  const errorCode = domainErrorCode ?? fallbackCode;
  if (domainErrorCode) {
    logger.warn(
      { socketId: socket.id, event: eventName, code: errorCode },
      "socket action rejected",
    );
  } else {
    logger.error(
      { err: error, socketId: socket.id, event: eventName, code: errorCode },
      "socket action failed unexpectedly",
    );
  }
  logRejectedSocketEvent(socket, eventName, errorCode);
  return errorCode;
}

// A plain Error's message may be any internal text, so only typed errors reach the client.
function resolveDomainErrorCode(error: unknown): ServerErrorCode | null {
  if (error instanceof DomainError || error instanceof GameRuleError) return error.code;
  return null;
}

export function broadcastRoomState(io: Server, roomState: PublicRoomState): void {
  io.to(roomState.roomId).emit(ServerToClientEvent.StateUpdate, {
    roomState,
  });
}

/**
 * Request/result events (Spotify search, playlist import, playback) answer on their own result
 * event because the client waits there, not on an ack. Each hook replaces the generic `error`
 * event for one kind of failure; the ack and the audit record are sent either way.
 */
type FailureReply<TParsed> = {
  invalidPayload?: (payload: unknown) => void;
  domainError?: (parsed: TParsed) => void;
  unexpectedError?: (parsed: TParsed) => void;
};

type CreateSocketHandlerOptions<TSchema extends z.ZodTypeAny> = {
  socket: Socket;
  event: string;
  schema: TSchema;
  invalidPayload: {
    code: ServerErrorCode;
    message: string;
  };
  log?: (parsed: z.output<TSchema>) => void;
  /** A returned promise is awaited; its rejection is handled like a thrown error. */
  handle: (parsed: z.output<TSchema>) => void | Promise<void>;
  fallbackErrorCode: ServerErrorCode;
  errorMessages: SocketErrorMessages;
  failureReply?: FailureReply<z.output<TSchema>>;
  idempotency?: {
    find: (parsed: z.output<TSchema>) => ActionAck | undefined;
    remember: (parsed: z.output<TSchema>, ack: ActionAck) => void;
  };
};

export function createSocketHandler<TSchema extends z.ZodTypeAny>(
  options: CreateSocketHandlerOptions<TSchema>,
): void {
  const { socket, event, failureReply } = options;

  socket.on(event, (payload: unknown, ack?: (response: ActionAck) => void) => {
    const requestId = getActionRequestId(payload);
    const parseResult = options.schema.safeParse(payload);

    if (!parseResult.success) {
      const { code, message } = options.invalidPayload;
      logRejectedSocketEvent(socket, event, code);
      ack?.({ ok: false, requestId, code });
      if (failureReply?.invalidPayload) {
        failureReply.invalidPayload(payload);
      } else {
        socket.emit(ServerToClientEvent.Error, { code, message });
      }
      return;
    }

    const parsed: z.output<TSchema> = parseResult.data;
    const succeed = (): void => {
      const successAck = { ok: true, requestId } satisfies ActionAck;
      options.idempotency?.remember(parsed, successAck);
      settleAuditedSocketEvent(socket, event);
      ack?.(successAck);
    };
    const fail = (error: unknown): void => {
      const reply = resolveDomainErrorCode(error)
        ? failureReply?.domainError
        : failureReply?.unexpectedError;
      const code = reply
        ? reportServerError(socket, event, error, options.fallbackErrorCode)
        : emitServerError(socket, event, error, options.fallbackErrorCode, options.errorMessages);
      reply?.(parsed);
      ack?.({ ok: false, requestId, code });
    };

    try {
      const replayAck = options.idempotency?.find(parsed);
      if (replayAck) {
        settleAuditedSocketEvent(socket, event);
        ack?.(replayAck);
        return;
      }

      options.log?.(parsed);
      const pending = options.handle(parsed);
      // A synchronous handler must remember its ack before the next packet is dispatched, or a
      // replay arriving in the same tick would run the action twice.
      if (pending) {
        void pending.then(succeed, fail);
        return;
      }
      succeed();
    } catch (error) {
      fail(error);
    }
  });
}

export function getActionRequestId(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const requestId = (payload as { requestId?: unknown }).requestId;
    if (typeof requestId === "string" && requestId.length > 0) {
      return requestId;
    }
  }

  return randomUUID();
}
