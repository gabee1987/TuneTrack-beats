import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ActionAck,
  type ClientToServerEventName,
} from "@tunetrack/shared";
import type { Socket } from "socket.io";
import { logger } from "../app/logger.js";
import { getActionRequestId } from "./createSocketHandler.js";
import { logRejectedSocketEvent } from "./realtimeAuditLogger.js";

export type RateLimitClass = "gameplay" | "search" | "tokenRefresh" | "directory" | "other";

interface RateLimit {
  capacity: number;
  windowMs: number;
}

/** `05` §2.4: each socket gets one bucket per class. */
export const RATE_LIMITS: Record<RateLimitClass, RateLimit> = {
  gameplay: { capacity: 10, windowMs: 5_000 },
  search: { capacity: 5, windowMs: 10_000 },
  // A player build plus the deferred retries of a reconnect race used up 3, and the playback
  // device never got its token (20 B24).
  tokenRefresh: { capacity: 6, windowMs: 60_000 },
  directory: { capacity: 10, windowMs: 10_000 },
  other: { capacity: 20, windowMs: 10_000 },
};

const RATE_LIMIT_CLASS_BY_EVENT: Partial<Record<ClientToServerEventName, RateLimitClass>> = {
  [ClientToServerEvent.AwardTt]: "gameplay",
  [ClientToServerEvent.BuyTimelineCardWithTt]: "gameplay",
  [ClientToServerEvent.ClaimChallenge]: "gameplay",
  [ClientToServerEvent.ConfirmReveal]: "gameplay",
  [ClientToServerEvent.PlaceCard]: "gameplay",
  [ClientToServerEvent.PlaceChallenge]: "gameplay",
  [ClientToServerEvent.PlaySpotifyTrack]: "gameplay",
  [ClientToServerEvent.ResolveChallengeWindow]: "gameplay",
  [ClientToServerEvent.SkipTrackWithTt]: "gameplay",
  [ClientToServerEvent.SkipTurn]: "gameplay",
  [ClientToServerEvent.StartGame]: "gameplay",
  [ClientToServerEvent.GenerateSpotifyCandidates]: "search",
  [ClientToServerEvent.ImportPlaylist]: "search",
  [ClientToServerEvent.OpenSpotifyPlaylist]: "search",
  [ClientToServerEvent.SearchSpotifyMusic]: "search",
  [ClientToServerEvent.SearchSpotifyPlaylists]: "search",
  [ClientToServerEvent.RefreshSpotifyToken]: "tokenRefresh",
  [ClientToServerEvent.GetRoomPreview]: "directory",
  [ClientToServerEvent.ListRooms]: "directory",
};

const RATE_LIMITED_MESSAGE = "Too many requests. Wait a few seconds and try again.";

export function getRateLimitClass(eventName: string): RateLimitClass {
  return RATE_LIMIT_CLASS_BY_EVENT[eventName as ClientToServerEventName] ?? "other";
}

interface TokenBucket {
  tokens: number;
  refilledAt: number;
  /** Set on the first refused packet so one breach logs once, however long it lasts. */
  isRefusing: boolean;
}

function takeToken(bucket: TokenBucket, limit: RateLimit, now: number): boolean {
  const refill = ((now - bucket.refilledAt) * limit.capacity) / limit.windowMs;
  bucket.tokens = Math.min(limit.capacity, bucket.tokens + refill);
  bucket.refilledAt = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

/** Refuses a packet over the limit with `RATE_LIMITED`; the socket stays connected. */
export function registerSocketRateLimit(socket: Socket): void {
  const buckets = new Map<RateLimitClass, TokenBucket>();

  socket.use((packet, next) => {
    const [eventName, payload] = packet;
    const limitClass = getRateLimitClass(eventName);
    const limit = RATE_LIMITS[limitClass];
    const now = Date.now();
    const bucket = buckets.get(limitClass) ?? {
      tokens: limit.capacity,
      refilledAt: now,
      isRefusing: false,
    };
    buckets.set(limitClass, bucket);

    if (takeToken(bucket, limit, now)) {
      bucket.isRefusing = false;
      next();
      return;
    }

    if (!bucket.isRefusing) {
      bucket.isRefusing = true;
      logger.warn({ socketId: socket.id, event: eventName, limitClass }, "socket rate limited");
      logRejectedSocketEvent(socket, eventName, "RATE_LIMITED", { limitClass });
    }
    refusePacket(socket, packet, payload);
  });
}

function refusePacket(socket: Socket, packet: unknown[], payload: unknown): void {
  const ack = packet[packet.length - 1];
  if (typeof ack === "function") {
    const refusal: ActionAck = {
      ok: false,
      requestId: getActionRequestId(payload),
      code: "RATE_LIMITED",
    };
    (ack as (response: ActionAck) => void)(refusal);
  }
  socket.emit(ServerToClientEvent.Error, { code: "RATE_LIMITED", message: RATE_LIMITED_MESSAGE });
}
