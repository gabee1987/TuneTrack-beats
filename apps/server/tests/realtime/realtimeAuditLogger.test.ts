import { beforeEach, describe, expect, it, vi } from "vitest";

const logInfo = vi.fn();

vi.mock("../../src/app/logger.js", () => ({
  logger: {
    info: (...args: unknown[]) => logInfo(...args),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/app/axiomLogSink.js", () => ({
  enqueueAxiomLogEvent: vi.fn(),
}));

process.env["ENABLE_EVENT_AUDIT"] = "true";

const { logRejectedSocketEvent, registerSocketAuditMiddleware, settleAuditedSocketEvent } =
  await import("../../src/realtime/realtimeAuditLogger.js");

interface AuditRecord {
  eventId?: string;
  eventName: string;
  outcome: string;
}

function auditRecords(): AuditRecord[] {
  return logInfo.mock.calls
    .map(([record]) => record as AuditRecord)
    .filter((record) => typeof record?.eventName === "string");
}

function createFakeSocket() {
  const middleware: Array<(packet: unknown[], next: () => void) => void> = [];

  return {
    id: "TEST_SOCKET_1",
    use(fn: (packet: unknown[], next: () => void) => void) {
      middleware.push(fn);
    },
    onAnyOutgoing() {},
    receive(eventName: string, payload?: unknown) {
      for (const fn of middleware) {
        fn([eventName, payload], () => {});
      }
    },
  };
}

describe("realtime audit correlation", () => {
  beforeEach(() => {
    logInfo.mockClear();
  });

  /**
   * A client that taps a dead control repeatedly sends the same event many times in one
   * tick. Ids were keyed by event name alone, so the burst collapsed into a single id: the
   * first rejection consumed it and every later one logged no id at all, which is exactly
   * when an audit trail most needs to be readable.
   */
  it("correlates every arrival in a burst, in the order it arrived", () => {
    const socket = createFakeSocket();
    registerSocketAuditMiddleware(socket as never);

    socket.receive("place_card", { roomId: "TEST_ROOM_1" });
    socket.receive("place_card", { roomId: "TEST_ROOM_1" });
    socket.receive("place_card", { roomId: "TEST_ROOM_1" });

    const arrivalIds = auditRecords()
      .filter((record) => record.outcome === "received")
      .map((record) => record.eventId);

    expect(new Set(arrivalIds).size).toBe(3);

    logRejectedSocketEvent(socket as never, "place_card", "ROOM_MEMBERSHIP_NOT_FOUND");
    logRejectedSocketEvent(socket as never, "place_card", "ROOM_MEMBERSHIP_NOT_FOUND");
    logRejectedSocketEvent(socket as never, "place_card", "ROOM_MEMBERSHIP_NOT_FOUND");

    const rejectionIds = auditRecords()
      .filter((record) => record.outcome === "rejected")
      .map((record) => record.eventId);

    expect(rejectionIds).toEqual(arrivalIds);
  });

  /**
   * Interleaved events must not consume each other's ids: the outcome of one event says
   * nothing about another that happened to arrive in the same tick.
   */
  it("keeps each event's ids to itself", () => {
    const socket = createFakeSocket();
    registerSocketAuditMiddleware(socket as never);

    socket.receive("place_card", { roomId: "TEST_ROOM_1" });
    socket.receive("list_rooms");

    const arrivals = auditRecords().filter((record) => record.outcome === "received");
    const placeCardArrivalId = arrivals.find(
      (record) => record.eventName === "place_card",
    )?.eventId;

    logRejectedSocketEvent(socket as never, "place_card", "ROOM_MEMBERSHIP_NOT_FOUND");

    const rejection = auditRecords().find((record) => record.outcome === "rejected");

    expect(rejection?.eventName).toBe("place_card");
    expect(rejection?.eventId).toBe(placeCardArrivalId);
  });

  /**
   * Accepted events are not audited, but each arrival still queued an id; without settling,
   * the queue grew for the socket's lifetime (B-17) and a later rejection took a stale id.
   */
  it("settles an accepted arrival so the next rejection gets its own id", () => {
    const socket = createFakeSocket();
    registerSocketAuditMiddleware(socket as never);

    socket.receive("place_card", { roomId: "TEST_ROOM_1" });
    settleAuditedSocketEvent(socket as never, "place_card");
    socket.receive("place_card", { roomId: "TEST_ROOM_1" });
    logRejectedSocketEvent(socket as never, "place_card", "NOT_ACTIVE_PLAYER");

    const arrivalIds = auditRecords()
      .filter((record) => record.outcome === "received")
      .map((record) => record.eventId);
    const rejection = auditRecords().find((record) => record.outcome === "rejected");

    expect(rejection?.eventId).toBe(arrivalIds[1]);
    expect(auditRecords().some((record) => record.outcome === "accepted")).toBe(false);
  });

  it("queues no id for an event the server does not handle", () => {
    const socket = createFakeSocket();
    registerSocketAuditMiddleware(socket as never);

    socket.receive("not_a_client_event", { roomId: "TEST_ROOM_1" });
    logRejectedSocketEvent(socket as never, "not_a_client_event", "RATE_LIMITED");

    expect(auditRecords().map((record) => record.eventId)).toEqual([undefined, undefined]);
  });
});
