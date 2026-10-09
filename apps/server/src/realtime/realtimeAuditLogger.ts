import { randomUUID } from "node:crypto";
import { enqueueAxiomLogEvent } from "../app/axiomLogSink.js";
import { env } from "../app/env.js";
import { logger } from "../app/logger.js";
import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import type { Socket } from "socket.io";

type AuditOutcome = "broadcast" | "emitted" | "received" | "rejected";

interface AuditLogInput {
  eventId?: string | undefined;
  eventName: string;
  outcome: AuditOutcome;
  socket?: Socket | undefined;
  roomId?: string | undefined;
  errorCode?: string | undefined;
  payload?: unknown;
  roomState?: PublicRoomState | undefined;
  meta?: Record<string, unknown> | undefined;
}

/**
 * One arrival of an event is one entry, held in arrival order. Keying by event name alone
 * collapsed a burst of the same event into a single id, so only the first outcome could be
 * correlated back to its `received` record and the rest logged no id at all. Every outcome
 * consumes its entry (a rejection logs it, a success only settles it), and only known client
 * events get one, so the queue stays bounded for the socket's lifetime.
 */
const pendingEventIdsBySocket = new WeakMap<Socket, Map<string, string[]>>();
const clientEventNames = new Set<string>(Object.values(ClientToServerEvent));

export function registerSocketAuditMiddleware(socket: Socket): void {
  if (!env.ENABLE_EVENT_AUDIT) return;

  socket.use((packet, next) => {
    const [eventName, payload] = packet;
    if (typeof eventName !== "string") {
      next();
      return;
    }

    const eventId = clientEventNames.has(eventName) ? randomUUID() : undefined;
    if (eventId) queueEventId(socket, eventName, eventId);

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

/** An accepted event is not audited (decision 9 keeps the audit scope); it only frees its id. */
export function settleAuditedSocketEvent(socket: Socket, eventName: string): void {
  consumeEventId(socket, eventName);
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
    errorCode: input.errorCode,
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

function queueEventId(socket: Socket, eventName: string, eventId: string): void {
  let pendingEventIds = pendingEventIdsBySocket.get(socket);
  if (!pendingEventIds) {
    pendingEventIds = new Map<string, string[]>();
    pendingEventIdsBySocket.set(socket, pendingEventIds);
  }
  const arrivalsForEvent = pendingEventIds.get(eventName) ?? [];
  arrivalsForEvent.push(eventId);
  pendingEventIds.set(eventName, arrivalsForEvent);
}

function consumeEventId(socket: Socket, eventName: string): string | undefined {
  const pendingEventIds = pendingEventIdsBySocket.get(socket);
  const arrivalsForEvent = pendingEventIds?.get(eventName);
  const eventId = arrivalsForEvent?.shift();

  if (arrivalsForEvent?.length === 0) {
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
