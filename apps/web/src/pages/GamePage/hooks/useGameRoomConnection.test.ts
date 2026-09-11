import { act, renderHook, waitFor } from "@testing-library/react";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../../../features/i18n";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
import { useGameRoomConnection } from "./useGameRoomConnection";

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
});
