import { GameRuleError } from "@tunetrack/game-engine";
import {
  ClientToServerEvent,
  DomainError,
  ServerToClientEvent,
  startGamePayloadSchema,
  type ActionAck,
} from "@tunetrack/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import { createSocketHandler, emitServerError } from "../../src/realtime/createSocketHandler.js";
import {
  logRejectedSocketEvent,
  settleAuditedSocketEvent,
} from "../../src/realtime/realtimeAuditLogger.js";
import {
  DEFAULT_SOCKET_ERROR_MESSAGE,
  resolveSocketErrorMessage,
  startGameErrorMessages,
} from "../../src/realtime/errorMessages.js";

vi.mock("../../src/realtime/realtimeAuditLogger.js", () => ({
  logRejectedSocketEvent: vi.fn(),
  settleAuditedSocketEvent: vi.fn(),
}));

function createMockSocket() {
  const listeners = new Map<
    string,
    (payload: unknown, ack?: (response: unknown) => void) => void
  >();
  const emitted: Array<{ event: string; payload: unknown }> = [];

  return {
    id: "socket-test",
    emitted,
    on(event: string, listener: (payload: unknown, ack?: (response: unknown) => void) => void) {
      listeners.set(event, listener);
    },
    emit(event: string, payload: unknown) {
      emitted.push({ event, payload });
    },
    trigger(event: string, payload: unknown, ack?: (response: unknown) => void) {
      listeners.get(event)?.(payload, ack);
    },
  };
}

describe("resolveSocketErrorMessage", () => {
  it("returns the mapped message for a known code", () => {
    expect(resolveSocketErrorMessage("ONLY_HOST_CAN_START_GAME", startGameErrorMessages)).toBe(
      "Only the host can start the game.",
    );
  });

  it("returns the default message for a code the event does not map", () => {
    expect(resolveSocketErrorMessage("ROOM_NOT_FOUND", startGameErrorMessages)).toBe(
      DEFAULT_SOCKET_ERROR_MESSAGE,
    );
  });
});

describe("emitServerError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits the thrown error code with catalog message", () => {
    const socket = createMockSocket();

    emitServerError(
      socket as never,
      "start_game",
      new DomainError("ONLY_HOST_CAN_START_GAME"),
      "START_GAME_FAILED",
      {
        ONLY_HOST_CAN_START_GAME: "Only the host can start the game.",
      },
    );

    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: {
          code: "ONLY_HOST_CAN_START_GAME",
          message: "Only the host can start the game.",
        },
      },
    ]);
  });

  it("falls back to default message when code is unmapped", () => {
    const socket = createMockSocket();

    emitServerError(
      socket as never,
      "start_game",
      new DomainError("ROOM_NOT_FOUND"),
      "START_GAME_FAILED",
      {},
    );

    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: {
          code: "ROOM_NOT_FOUND",
          message: DEFAULT_SOCKET_ERROR_MESSAGE,
        },
      },
    ]);
  });

  it("passes an engine rule code through", () => {
    const socket = createMockSocket();

    const code = emitServerError(
      socket as never,
      "place_card",
      new GameRuleError("NOT_ACTIVE_PLAYER"),
      "PLACE_CARD_FAILED",
      {},
    );

    expect(code).toBe("NOT_ACTIVE_PLAYER");
  });

  it.each([
    ["a TypeError", new TypeError("Cannot read properties of undefined (reading 'turn')")],
    ["a plain Error", new Error("ONLY_HOST_CAN_START_GAME")],
  ])("reports %s as the fallback code and logs it with its stack", (_name, error) => {
    const socket = createMockSocket();
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    const code = emitServerError(
      socket as never,
      "start_game",
      error,
      "START_GAME_FAILED",
      startGameErrorMessages,
    );

    expect(code).toBe("START_GAME_FAILED");
    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: { code: "START_GAME_FAILED", message: DEFAULT_SOCKET_ERROR_MESSAGE },
      },
    ]);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ err: error, code: "START_GAME_FAILED" }),
      "socket action failed unexpectedly",
    );
    expect(error.stack).toBeTruthy();
  });
});

describe("createSocketHandler", () => {
  it("acknowledges a successful action", () => {
    const socket = createMockSocket();
    const ack = vi.fn();

    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      },
      handle: vi.fn(),
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
    });

    socket.trigger(
      ClientToServerEvent.StartGame,
      { roomId: "party-room", requestId: "00000000-0000-4000-8000-000000000001" },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      requestId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("acknowledges an invalid payload and keeps emitting the compatibility error", () => {
    const socket = createMockSocket();
    const ack = vi.fn();

    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      },
      handle: vi.fn(),
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
    });

    socket.trigger(
      ClientToServerEvent.StartGame,
      { roomId: "", requestId: "00000000-0000-4000-8000-000000000002" },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      requestId: "00000000-0000-4000-8000-000000000002",
      code: "INVALID_START_GAME_PAYLOAD",
    });
    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: {
          code: "INVALID_START_GAME_PAYLOAD",
          message: "Room code is invalid.",
        },
      },
    ]);
  });

  it("acknowledges a thrown service error", () => {
    const socket = createMockSocket();
    const ack = vi.fn();

    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      },
      handle: () => {
        throw new DomainError("ONLY_HOST_CAN_START_GAME");
      },
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
    });

    socket.trigger(
      ClientToServerEvent.StartGame,
      { roomId: "party-room", requestId: "00000000-0000-4000-8000-000000000003" },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      requestId: "00000000-0000-4000-8000-000000000003",
      code: "ONLY_HOST_CAN_START_GAME",
    });
  });

  it("emits the expected error for an invalid payload", () => {
    const socket = createMockSocket();
    const handle = vi.fn();

    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      },
      handle,
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
    });

    socket.trigger(ClientToServerEvent.StartGame, { roomId: "" });

    expect(handle).not.toHaveBeenCalled();
    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: {
          code: "INVALID_START_GAME_PAYLOAD",
          message: "Room code is invalid.",
        },
      },
    ]);
  });

  it("runs handle for a valid payload", () => {
    const socket = createMockSocket();
    const handle = vi.fn();

    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      },
      handle,
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
    });

    socket.trigger(ClientToServerEvent.StartGame, { roomId: "party-room" });

    expect(handle).toHaveBeenCalledWith({ roomId: "party-room" });
    expect(socket.emitted).toEqual([]);
  });

  it("maps thrown service errors through the error catalog", () => {
    const socket = createMockSocket();

    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: {
        code: "INVALID_START_GAME_PAYLOAD",
        message: "Room code is invalid.",
      },
      handle: () => {
        throw new DomainError("ONLY_HOST_CAN_START_GAME");
      },
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
    });

    socket.trigger(ClientToServerEvent.StartGame, { roomId: "party-room" });

    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: {
          code: "ONLY_HOST_CAN_START_GAME",
          message: "Only the host can start the game.",
        },
      },
    ]);
  });
});

describe("createSocketHandler pipeline", () => {
  const VALID_PAYLOAD = {
    roomId: "TEST_ROOM_1",
    requestId: "00000000-0000-4000-8000-000000000010",
  };
  const INVALID_PAYLOAD = { roomId: "", requestId: "00000000-0000-4000-8000-000000000011" };

  type HandlerOptions = Parameters<typeof createSocketHandler<typeof startGamePayloadSchema>>[0];

  function registerStartGame(overrides: Partial<HandlerOptions>) {
    const socket = createMockSocket();
    createSocketHandler({
      socket: socket as never,
      event: ClientToServerEvent.StartGame,
      schema: startGamePayloadSchema,
      invalidPayload: { code: "INVALID_START_GAME_PAYLOAD", message: "Room code is invalid." },
      handle: vi.fn(),
      fallbackErrorCode: "START_GAME_FAILED",
      errorMessages: startGameErrorMessages,
      ...overrides,
    });
    return socket;
  }

  function trigger(socket: ReturnType<typeof createMockSocket>, payload: unknown) {
    const ack = vi.fn<(response: ActionAck) => void>();
    socket.trigger(ClientToServerEvent.StartGame, payload, ack as never);
    return ack;
  }

  beforeEach(() => {
    vi.mocked(logRejectedSocketEvent).mockClear();
    vi.mocked(settleAuditedSocketEvent).mockClear();
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("acknowledges an asynchronous handler only after it resolves", async () => {
    let finish: () => void = () => undefined;
    const socket = registerStartGame({
      handle: () => new Promise<void>((resolve) => (finish = resolve)),
    });

    const ack = trigger(socket, VALID_PAYLOAD);
    expect(ack).not.toHaveBeenCalled();

    finish();
    await vi.waitFor(() =>
      expect(ack).toHaveBeenCalledWith({ ok: true, requestId: VALID_PAYLOAD.requestId }),
    );
    expect(settleAuditedSocketEvent).toHaveBeenCalledWith(socket, ClientToServerEvent.StartGame);
  });

  it("maps an asynchronous domain rejection like a thrown one", async () => {
    const socket = registerStartGame({
      handle: () => Promise.reject(new DomainError("ONLY_HOST_CAN_START_GAME")),
    });

    const ack = trigger(socket, VALID_PAYLOAD);

    await vi.waitFor(() =>
      expect(ack).toHaveBeenCalledWith({
        ok: false,
        requestId: VALID_PAYLOAD.requestId,
        code: "ONLY_HOST_CAN_START_GAME",
      }),
    );
    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: { code: "ONLY_HOST_CAN_START_GAME", message: "Only the host can start the game." },
      },
    ]);
    expect(logRejectedSocketEvent).toHaveBeenCalledWith(
      socket,
      ClientToServerEvent.StartGame,
      "ONLY_HOST_CAN_START_GAME",
    );
  });

  it("answers an unexpected asynchronous failure through the failure reply", async () => {
    const unexpectedError = vi.fn();
    const socket = registerStartGame({
      handle: () => Promise.reject(new TypeError("TEST_FAILURE")),
      failureReply: { unexpectedError },
    });

    const ack = trigger(socket, VALID_PAYLOAD);

    await vi.waitFor(() =>
      expect(ack).toHaveBeenCalledWith({
        ok: false,
        requestId: VALID_PAYLOAD.requestId,
        code: "START_GAME_FAILED",
      }),
    );
    expect(unexpectedError).toHaveBeenCalledWith(VALID_PAYLOAD);
    expect(socket.emitted).toEqual([]);
    expect(logRejectedSocketEvent).toHaveBeenCalledWith(
      socket,
      ClientToServerEvent.StartGame,
      "START_GAME_FAILED",
    );
  });

  it("keeps the generic error event for a domain error when only unexpected errors are replied", async () => {
    const unexpectedError = vi.fn();
    const socket = registerStartGame({
      handle: () => Promise.reject(new DomainError("ONLY_HOST_CAN_START_GAME")),
      failureReply: { unexpectedError },
    });

    const ack = trigger(socket, VALID_PAYLOAD);

    await vi.waitFor(() => expect(ack).toHaveBeenCalled());
    expect(unexpectedError).not.toHaveBeenCalled();
    expect(socket.emitted.map((entry) => entry.event)).toEqual([ServerToClientEvent.Error]);
  });

  it("audits, acknowledges and replies to a schema failure", () => {
    const invalidPayload = vi.fn();
    const handle = vi.fn();
    const socket = registerStartGame({ handle, failureReply: { invalidPayload } });

    const ack = trigger(socket, INVALID_PAYLOAD);

    expect(handle).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      requestId: INVALID_PAYLOAD.requestId,
      code: "INVALID_START_GAME_PAYLOAD",
    });
    expect(invalidPayload).toHaveBeenCalledWith(INVALID_PAYLOAD);
    expect(socket.emitted).toEqual([]);
    expect(logRejectedSocketEvent).toHaveBeenCalledWith(
      socket,
      ClientToServerEvent.StartGame,
      "INVALID_START_GAME_PAYLOAD",
    );
  });

  it("replays a remembered ack without running the action again", () => {
    const remembered = new Map<string, ActionAck>();
    const handle = vi.fn();
    const socket = registerStartGame({
      handle,
      idempotency: {
        find: (data) => (data.requestId ? remembered.get(data.requestId) : undefined),
        remember: (data, ack) => {
          if (data.requestId) remembered.set(data.requestId, ack);
        },
      },
    });

    const firstAck = trigger(socket, VALID_PAYLOAD);
    const secondAck = trigger(socket, VALID_PAYLOAD);

    expect(handle).toHaveBeenCalledTimes(1);
    expect(secondAck).toHaveBeenCalledWith(firstAck.mock.calls[0]?.[0]);
    expect(settleAuditedSocketEvent).toHaveBeenCalledTimes(2);
  });
});
