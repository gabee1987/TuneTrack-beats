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

/**
 * One arrival of an event is one entry. Keying by event name alone collapses a burst of
 * the same event into a single id, which drops the correlation between the `received`
 * record and every rejection after the first.
 */
const pendingEventIdsBySocket = new WeakMap<Socket, Map<string, string[]>>();

export function registerSocketAuditMiddleware(socket: Socket): void {
  if (!env.ENABLE_EVENT_AUDIT) return;

  socket.use((packet, next) => {
    const [eventName, payload] = packet;
    if (typeof eventName !== "string") {
      next();
      return;
    }

    const eventId = randomUUID();
    let pendingEventIds = pendingEventIdsBySocket.get(socket);
    if (!pendingEventIds) {
      pendingEventIds = new Map<string, string[]>();
      pendingEventIdsBySocket.set(socket, pendingEventIds);
    }
    const pendingForEvent = pendingEventIds.get(eventName) ?? [];
    pendingForEvent.push(eventId);
    pendingEventIds.set(eventName, pendingForEvent);

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
    payload: resolveAuditPayload(input.eventName, input.payload),
    room: input.roomState ? summarizeRoomState(input.roomState) : undefined,
    ...input.meta,
  };

  logger.info(auditEvent, "realtime audit");
  enqueueAxiomLogEvent(auditEvent);
}

function resolveAuditPayload(eventName: string, payload: unknown): unknown {
  // Playback results must always be diagnosable even when full payload audit is off.
  if (eventName === "spotify_playback_result") {
    return summarizeSpotifyPlaybackResult(payload);
  }
  if (!env.EVENT_AUDIT_INCLUDE_PAYLOADS) {
    return undefined;
  }
  return summarizePayload(payload);
}

function summarizeSpotifyPlaybackResult(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const value = payload as Record<string, unknown>;
  return {
    success: value.success,
    requestId: value.requestId,
    code: value.code,
    message: typeof value.message === "string" ? value.message : undefined,
  };
}

function consumeEventId(socket: Socket, eventName: string): string | undefined {
  const pendingEventIds = pendingEventIdsBySocket.get(socket);
  const pendingForEvent = pendingEventIds?.get(eventName);
  const eventId = pendingForEvent?.shift();

  if (pendingForEvent?.length === 0) {
    pendingEventIds?.delete(eventName);
  }

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
    spotifyPlaybackOwnerPlayerId: roomState.settings.spotifyPlaybackOwnerPlayerId,
    spotifyPlaybackGeneration: roomState.settings.spotifyPlaybackGeneration,
    importedTrackCount: roomState.settings.importedTrackCount,
    currentTrackId: roomState.currentTrackCard?.id,
    turnNumber: roomState.turn?.turnNumber,
    activePlayerId: roomState.turn?.activePlayerId,
    revealType: roomState.revealState?.revealType,
    revealWasCorrect: roomState.revealState?.wasCorrect,
    winnerPlayerId: roomState.winnerPlayerId,
  };
}
