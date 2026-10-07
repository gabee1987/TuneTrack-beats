import { ClientToServerEvent, ServerToClientEvent, type ActionAck } from "@tunetrack/shared";
import type { Socket } from "socket.io";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import {
  getRateLimitClass,
  RATE_LIMITS,
  registerSocketRateLimit,
} from "../../src/realtime/rateLimit.js";

type Middleware = (packet: unknown[], next: (error?: Error) => void) => void;

function createRateLimitedSocket() {
  let middleware: Middleware | undefined;
  const socket = {
    id: "socket-12345",
    emit: vi.fn(),
    disconnect: vi.fn(),
    use: vi.fn((registered: Middleware) => {
      middleware = registered;
    }),
  };
  registerSocketRateLimit(socket as unknown as Socket);

  function send(eventName: string, ack?: (response: ActionAck) => void): boolean {
    let isDispatched = false;
    const packet: unknown[] = [eventName, { roomId: "TEST_ROOM_1", requestId: "request-12345" }];
    if (ack) packet.push(ack);
    middleware?.(packet, () => {
      isDispatched = true;
    });
    return isDispatched;
  }

  function sendMany(eventName: string, count: number): boolean[] {
    return Array.from({ length: count }, () => send(eventName));
  }

  return { send, sendMany, socket };
}

describe("socket rate limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("lets a burst up to the class capacity through", () => {
    const { sendMany, socket } = createRateLimitedSocket();

    expect(sendMany(ClientToServerEvent.PlaceCard, RATE_LIMITS.gameplay.capacity)).not.toContain(
      false,
    );
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("refuses the packet over the limit with RATE_LIMITED and keeps the socket", () => {
    const { send, sendMany, socket } = createRateLimitedSocket();
    sendMany(ClientToServerEvent.PlaceCard, RATE_LIMITS.gameplay.capacity);
    const ack = vi.fn();

    expect(send(ClientToServerEvent.PlaceCard, ack)).toBe(false);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      requestId: "request-12345",
      code: "RATE_LIMITED",
    });
    expect(socket.emit).toHaveBeenCalledWith(
      ServerToClientEvent.Error,
      expect.objectContaining({ code: "RATE_LIMITED" }),
    );
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("logs one warning per breach, not one per refused packet", () => {
    const { sendMany } = createRateLimitedSocket();

    sendMany(ClientToServerEvent.PlaceCard, RATE_LIMITS.gameplay.capacity + 5);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ limitClass: "gameplay" }),
      "socket rate limited",
    );
  });

  it("refills over the window", () => {
    const { send, sendMany } = createRateLimitedSocket();
    const { capacity, windowMs } = RATE_LIMITS.gameplay;
    sendMany(ClientToServerEvent.PlaceCard, capacity);

    vi.advanceTimersByTime(windowMs / capacity - 1);
    expect(send(ClientToServerEvent.PlaceCard)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(send(ClientToServerEvent.PlaceCard)).toBe(true);

    vi.advanceTimersByTime(windowMs);
    expect(sendMany(ClientToServerEvent.PlaceCard, capacity)).not.toContain(false);
  });

  it("keeps a separate bucket per class", () => {
    const { send, sendMany } = createRateLimitedSocket();
    sendMany(ClientToServerEvent.SearchSpotifyMusic, RATE_LIMITS.search.capacity);

    expect(send(ClientToServerEvent.SearchSpotifyPlaylists)).toBe(false);
    expect(send(ClientToServerEvent.PlaceCard)).toBe(true);
    expect(send(ClientToServerEvent.ListRooms)).toBe(true);
  });

  it("keeps a separate bucket per socket", () => {
    const first = createRateLimitedSocket();
    const second = createRateLimitedSocket();
    first.sendMany(ClientToServerEvent.RefreshSpotifyToken, RATE_LIMITS.tokenRefresh.capacity);

    expect(first.send(ClientToServerEvent.RefreshSpotifyToken)).toBe(false);
    expect(second.send(ClientToServerEvent.RefreshSpotifyToken)).toBe(true);
  });

  it("classifies events into the budget classes", () => {
    expect(getRateLimitClass(ClientToServerEvent.SkipTurn)).toBe("gameplay");
    expect(getRateLimitClass(ClientToServerEvent.ImportPlaylist)).toBe("search");
    expect(getRateLimitClass(ClientToServerEvent.RefreshSpotifyToken)).toBe("tokenRefresh");
    expect(getRateLimitClass(ClientToServerEvent.GetRoomPreview)).toBe("directory");
    expect(getRateLimitClass(ClientToServerEvent.JoinRoom)).toBe("other");
    expect(getRateLimitClass("unknown_event")).toBe("other");
  });
});
