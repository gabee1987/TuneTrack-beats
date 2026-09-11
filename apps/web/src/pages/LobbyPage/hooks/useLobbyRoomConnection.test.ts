import { act, renderHook, waitFor } from "@testing-library/react";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../../../features/i18n";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
import { getLobbyRoomStateUpdateDecision, useLobbyRoomConnection } from "./useLobbyRoomConnection";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

beforeEach(() => {
  resetSharedFakeSocket();
});

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

describe("getLobbyRoomStateUpdateDecision", () => {
  it("accepts state updates for the requested room", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room-1",
        nextStatus: "lobby",
        requestedRoomId: "party-room-1",
      }),
    ).toEqual({
      accept: true,
      shouldNavigateToRoom: false,
    });
  });

  it("navigates when an established lobby room is renamed by the host", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room-1",
        nextStatus: "lobby",
        requestedRoomId: "party-room",
      }),
    ).toEqual({
      accept: true,
      shouldNavigateToRoom: true,
    });
  });

  it("ignores stale updates from a previous room after the player requested a new room", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room",
        nextStatus: "lobby",
        requestedRoomId: "party-room-1",
      }),
    ).toEqual({
      accept: false,
      shouldNavigateToRoom: false,
    });
  });
});

describe("useLobbyRoomConnection", () => {
  it("creates once and joins when the same hook instance reconnects", async () => {
    const socket = getSharedFakeSocket();
    const navigate = vi.fn();

    renderHook(
      () =>
        useLobbyRoomConnection({
          displayName: "Player One",
          intent: "create",
          navigate,
          playerSessionId: "TEST_SESSION_1",
          roomId: "TEST_ROOM_1",
        }),
      { wrapper: I18nTestWrapper },
    );

    await waitFor(() => {
      expect(socket.emittedFor(ClientToServerEvent.CreateRoom)).toHaveLength(1);
    });

    act(() => {
      socket.simulateReconnect();
    });

    expect(socket.emittedFor(ClientToServerEvent.CreateRoom)).toHaveLength(1);
    expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toEqual([
      {
        displayName: "Player One",
        roomId: "TEST_ROOM_1",
        sessionId: "TEST_SESSION_1",
      },
    ]);
  });

  it("keeps its socket handshake and listeners unchanged when the language changes", async () => {
    const socket = getSharedFakeSocket();
    const navigate = vi.fn();
    const onSpy = vi.spyOn(socket, "on");
    const offSpy = vi.spyOn(socket, "off");

    const view = renderHook(
      () => {
        const { setLanguage } = useI18n();
        const connection = useLobbyRoomConnection({
          displayName: "Player One",
          intent: "join",
          navigate,
          playerSessionId: "TEST_SESSION_1",
          roomId: "TEST_ROOM_1",
        });
        return { connection, setLanguage };
      },
      { wrapper: I18nTestWrapper },
    );

    await waitFor(() => {
      expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toHaveLength(1);
    });
    socket.clearEmitted();
    const listenerRegistrationCount = onSpy.mock.calls.length;

    await act(async () => {
      view.result.current.setLanguage("hu");
      await Promise.resolve();
    });

    expect(socket.emitted).toHaveLength(0);
    expect(onSpy).toHaveBeenCalledTimes(listenerRegistrationCount);
    expect(offSpy).not.toHaveBeenCalled();

    act(() => {
      socket.serverEmit(ServerToClientEvent.Error, {
        code: "ONLY_HOST_CAN_START_GAME",
        message: "Only the host can start the game.",
      });
    });

    expect(view.result.current.connection.errorMessage).toBe(
      "Csak a host indíthatja el a játékot.",
    );
  });
});
