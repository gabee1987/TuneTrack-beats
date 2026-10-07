import { act, renderHook, waitFor } from "@testing-library/react";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared";
import { createElement, type ReactNode } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../../../features/i18n";
import { trackSocketConnection } from "../../../services/socket/connectionState";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
import { useGameRoomConnection } from "./useGameRoomConnection";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

beforeEach(() => {
  resetSharedFakeSocket();
});

let untrackConnection: (() => void) | null = null;

afterEach(() => {
  untrackConnection?.();
  untrackConnection = null;
});

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

describe("useGameRoomConnection", () => {
  it("keeps its socket handshake and listeners unchanged when the language changes", async () => {
    const socket = getSharedFakeSocket();
    const navigate = vi.fn();
    const onSpy = vi.spyOn(socket, "on");
    const offSpy = vi.spyOn(socket, "off");

    const view = renderHook(
      () => {
        const { setLanguage } = useI18n();
        const connection = useGameRoomConnection({
          navigate,
          roomId: "TEST_ROOM_1",
          routeState: {},
          playerSessionId: "TEST_SESSION_1",
          rememberedDisplayName: "Player One",
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

  it("joins once per room id even when navigate changes with the location", async () => {
    const socket = getSharedFakeSocket();
    const view = renderHook(
      ({ navigate }: { navigate: NavigateFunction }) =>
        useGameRoomConnection({
          navigate,
          roomId: "TEST_ROOM_1",
          routeState: {},
          playerSessionId: "TEST_SESSION_1",
          rememberedDisplayName: "Player One",
        }),
      { initialProps: { navigate: vi.fn() }, wrapper: I18nTestWrapper },
    );
    await waitFor(() => {
      expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toHaveLength(1);
    });

    view.rerender({ navigate: vi.fn() });
    view.rerender({ navigate: vi.fn() });
    await act(async () => {
      await Promise.resolve();
    });

    expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toHaveLength(1);
  });

  it.each([
    { didServerAnnounceShutdown: false, expectedReason: "closed" },
    { didServerAnnounceShutdown: true, expectedReason: "server_restarted" },
  ])(
    "explains a missing room as $expectedReason",
    async ({ didServerAnnounceShutdown, expectedReason }) => {
      const socket = getSharedFakeSocket();
      untrackConnection = trackSocketConnection(socket as unknown as Socket);
      const view = renderHook(
        () =>
          useGameRoomConnection({
            navigate: vi.fn(),
            roomId: "TEST_ROOM_1",
            routeState: {},
            playerSessionId: "TEST_SESSION_1",
            rememberedDisplayName: "Player One",
          }),
        { wrapper: I18nTestWrapper },
      );
      await waitFor(() => {
        expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toHaveLength(1);
      });

      act(() => {
        if (didServerAnnounceShutdown) socket.serverEmit(ServerToClientEvent.ServerShuttingDown);
        socket.simulateReconnect();
        socket.serverEmit(ServerToClientEvent.Error, {
          code: "ROOM_NOT_FOUND",
          message: "Room not found.",
        });
      });

      expect(view.result.current.hasClosedRoomReset).toBe(true);
      expect(view.result.current.closedRoomReason).toBe(expectedReason);
    },
  );

  it("shows a fresh refusal toast each time an action is refused offline", async () => {
    const view = renderHook(
      () =>
        useGameRoomConnection({
          navigate: vi.fn(),
          roomId: "TEST_ROOM_1",
          routeState: {},
          playerSessionId: "TEST_SESSION_1",
          rememberedDisplayName: "Player One",
        }),
      { wrapper: I18nTestWrapper },
    );
    const initialErrorKey = view.result.current.errorKey;

    act(() => view.result.current.showOfflineActionRefusal());
    act(() => view.result.current.showOfflineActionRefusal());

    expect(view.result.current.errorMessage).toBe(
      "You are offline, so this action was not sent. Try again once you are reconnected.",
    );
    expect(view.result.current.errorKey).toBe(initialErrorKey + 2);
  });
});
