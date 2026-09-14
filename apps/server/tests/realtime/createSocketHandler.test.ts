import { ClientToServerEvent, ServerToClientEvent, startGamePayloadSchema } from "@tunetrack/shared";
import { describe, expect, it, vi } from "vitest";
import {
  createSocketHandler,
  emitServerError,
} from "../../src/realtime/createSocketHandler.js";
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

  it("returns the default message for an unknown code", () => {
    expect(resolveSocketErrorMessage("UNKNOWN_CODE", startGameErrorMessages)).toBe(
      DEFAULT_SOCKET_ERROR_MESSAGE,
    );
  });
});

describe("emitServerError", () => {
  it("emits the thrown error code with catalog message", () => {
    const socket = createMockSocket();

    emitServerError(socket as never, "start_game", new Error("ONLY_HOST_CAN_START_GAME"), "START_GAME_FAILED", {
      ONLY_HOST_CAN_START_GAME: "Only the host can start the game.",
    });

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

    emitServerError(socket as never, "start_game", new Error("SOME_NEW_CODE"), "START_GAME_FAILED", {});

    expect(socket.emitted).toEqual([
      {
        event: ServerToClientEvent.Error,
        payload: {
          code: "SOME_NEW_CODE",
          message: DEFAULT_SOCKET_ERROR_MESSAGE,
        },
      },
    ]);
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
        throw new Error("ONLY_HOST_CAN_START_GAME");
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
        throw new Error("ONLY_HOST_CAN_START_GAME");
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
