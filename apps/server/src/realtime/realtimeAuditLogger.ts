import { randomUUID } from "node:crypto";
import { enqueueAxiomLogEvent } from "../app/axiomLogSink.js";
import { env } from "../app/env.js";
import { logger } from "../app/logger.js";
import type { PublicRoomState } from "@tunetrack/shared";
import type { Socket } from "socket.io";

type AuditOutcome = "accepted" | "broadcast" | "emitted" | "received" | "rejected";

interface AuditLogInput {
  eventId?: string | undefined;
  eventName: string;
  outcome: AuditOutcome;
  socket?: Socket | undefined;
  roomId?: string | undefined;
  playerId?: string | undefined;
  errorCode?: string | undefined;
  durationMs?: number | undefined;
  payload?: unknown;
  roomState?: PublicRoomState | undefined;
  meta?: Record<string, unknown> | undefined;
}

const pendingEventIdsBySocket = new WeakMap<Socket, Map<string, string>>();
const lastEventNameBySocket = new WeakMap<Socket, string>();

export function registerSocketAuditMiddleware(socket: Socket): void {
  if (!env.ENABLE_EVENT_AUDIT) return;

  socket.use((packet, next) => {
    const [eventName, payload] = packet;
    if (typeof eventName !== "string") {
      next();
      return;
    }

    const eventId = randomUUID();
    lastEventNameBySocket.set(socket, eventName);
    let pendingEventIds = pendingEventIdsBySocket.get(socket);
    if (!pendingEventIds) {
      pendingEventIds = new Map<string, string>();
      pendingEventIdsBySocket.set(socket, pendingEventIds);
    }
    pendingEventIds.set(eventName, eventId);

    logRealtimeAudit({
      eventId,
      eventName,
      outcome: "received",
      socket,
      roomId: extractRoomId(payload),
      payload,
    });
    next();
  });

  socket.onAnyOutgoing((eventName, payload) => {
    logRealtimeAudit({
      eventName,
      outcome: "emitted",
      socket,
      roomId: extractRoomId(payload),
      payload,
    });
  });
}

export function logAcceptedSocketEvent(
  socket: Socket,
  eventName: string,
  roomState: PublicRoomState,
  meta?: Record<string, unknown>,
): void {
  logRealtimeAudit({
    eventId: consumeEventId(socket, eventName),
    eventName,
    outcome: "accepted",
    socket,
    roomId: roomState.roomId,
    roomState,
    meta,
  });
}

export function logRejectedSocketEvent(
  socket: Socket,
  eventName: string,
  errorCode: string,
  meta?: Record<string, unknown>,
): void {
  logRealtimeAudit({
    eventId: consumeEventId(socket, eventName),
    eventName,
    outcome: "rejected",
    socket,
    errorCode,
    meta,
  });
}

export function logRejectedCurrentSocketEvent(
  socket: Socket,
  errorCode: string,
  meta?: Record<string, unknown>,
): void {
  const eventName = lastEventNameBySocket.get(socket) ?? "unknown";
  logRejectedSocketEvent(socket, eventName, errorCode, meta);
}

export function logRoomStateBroadcast(eventName: string, roomState: PublicRoomState): void {
  logRealtimeAudit({
    eventName,
    outcome: "broadcast",
    roomId: roomState.roomId,
    roomState,
  });
}

function logRealtimeAudit(input: AuditLogInput): void {
  if (!env.ENABLE_EVENT_AUDIT) return;

  const auditEvent = {
    service: "tunetrack-server",
    time: new Date().toISOString(),
    testRunId: env.TEST_RUN_ID,
    auditKind: "realtime",
    eventId: input.eventId,
    direction:
      input.outcome === "broadcast" || input.outcome === "emitted"
        ? "server_to_client"
        : "client_to_server",
    eventName: input.eventName,
    outcome: input.outcome,
    socketId: input.socket?.id,
    roomId: input.roomId,
    playerId: input.playerId,
    errorCode: input.errorCode,
    durationMs: input.durationMs,
    payload: env.EVENT_AUDIT_INCLUDE_PAYLOADS ? summarizePayload(input.payload) : undefined,
    room: input.roomState ? summarizeRoomState(input.roomState) : undefined,
    ...input.meta,
  };

  logger.info(auditEvent, "realtime audit");
  enqueueAxiomLogEvent(auditEvent);
}

function consumeEventId(socket: Socket, eventName: string): string | undefined {
  const pendingEventIds = pendingEventIdsBySocket.get(socket);
  const eventId = pendingEventIds?.get(eventName);
  pendingEventIds?.delete(eventName);
  return eventId;
}

function extractRoomId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const roomId = (payload as { roomId?: unknown }).roomId;
  return typeof roomId === "string" ? roomId : undefined;
}

function summarizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const value = payload as Record<string, unknown>;
  return {
    ...copyPrimitiveFields(value),
    ...(Array.isArray(value.tracks) ? { trackCount: value.tracks.length } : {}),
    ...(Array.isArray(value.trackIds) ? { trackIdCount: value.trackIds.length } : {}),
  };
}

function copyPrimitiveFields(value: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (
      fieldValue === null ||
      typeof fieldValue === "string" ||
      typeof fieldValue === "number" ||
      typeof fieldValue === "boolean"
    ) {
      summary[key] = key.toLowerCase().includes("token") ? "[redacted]" : fieldValue;
    }
  }
  return summary;
}

function summarizeRoomState(roomState: PublicRoomState): Record<string, unknown> {
  return {
    roomId: roomState.roomId,
    status: roomState.status,
    playerCount: roomState.players.length,
    hostId: roomState.hostId,
    importedTrackCount: roomState.settings.importedTrackCount,
    currentTrackId: roomState.currentTrackCard?.id,
    turnNumber: roomState.turn?.turnNumber,
    activePlayerId: roomState.turn?.activePlayerId,
    revealType: roomState.revealState?.revealType,
    revealWasCorrect: roomState.revealState?.wasCorrect,
    winnerPlayerId: roomState.winnerPlayerId,
  };
}
