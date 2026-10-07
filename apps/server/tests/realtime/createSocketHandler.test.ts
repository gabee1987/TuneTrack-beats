import { GameRuleError } from "@tunetrack/game-engine";
import {
  ClientToServerEvent,
  DomainError,
  ServerToClientEvent,
  startGamePayloadSchema,
} from "@tunetrack/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import { createSocketHandler, emitServerError } from "../../src/realtime/createSocketHandler.js";
import {
  DEFAULT_SOCKET_ERROR_MESSAGE,
  resolveSocketErrorMessage,
  startGameErrorMessages,
} from "../../src/realtime/errorMessages.js";

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
