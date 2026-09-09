import { ServerToClientEvent } from "@tunetrack/shared";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../features/i18n";
import { AppLoadingProvider } from "../features/loading";
import { AppToastProvider } from "../features/toast";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../test/fakeSocket";
import { buildTurnRoomState, TEST_HOST_ID, TEST_ROOM_ID } from "../test/roomStateFixtures";
import { seedLocalStorage } from "../test/stubs/storage";
import { useMobileViewport } from "../test/stubs/viewport";

vi.mock("../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const socket = getSharedFakeSocket();

function buildRouter(initialPath: string) {
  return createMemoryRouter(
    [
      {
        path: "/",
        Component: AppRoutes,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("../pages/HomePage/HomePage")).HomePage,
            }),
          },
          {
            path: "play",
            lazy: async () => ({
              Component: (await import("../pages/PlayPage/PlayPage")).PlayPage,
            }),
          },
          {
            path: "game/:roomId",
            lazy: async () => ({
              Component: (await import("../pages/GamePage/GamePage")).GamePage,
            }),
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
}

/**
 * Covers the state and navigation path behind defect B10: the room closes, the client is
 * sent home, and the home screen's primary action must still navigate.
 *
 * It passes on the code where B10 reproduces on a device, which bounds what it can prove:
 * jsdom runs no rAF-driven animation and computes no layout, so a page left mounted by an
 * unfinished exit — covering the home screen and swallowing the tap — is invisible here.
 * Treat this as a guard on the logic, not as evidence that B10 is fixed.
 */
describe("closing a room, then starting a new one", () => {
  beforeAll(() => {
    // jsdom's AbortSignal is not Node's, so Node's global Request rejects the signal the
    // router builds. The router only reads `url`, `method` and `signal`.
    class PassthroughRequest {
      readonly url: string;
      readonly method: string;
      readonly signal: AbortSignal;

      constructor(url: string, init?: { method?: string; signal?: AbortSignal }) {
        this.url = url;
        this.method = init?.method ?? "GET";
        this.signal = init?.signal ?? new AbortController().signal;
      }
    }
    Reflect.set(globalThis, "Request", PassthroughRequest);
  });

  beforeEach(() => {
    resetSharedFakeSocket();
    useMobileViewport();
    seedLocalStorage({ "tunetrack.playerDisplayName": "Player 1" });
  });

  it("leaves the home screen's primary action working", async () => {
    const user = userEvent.setup();
    const router = buildRouter(`/game/${TEST_ROOM_ID}`);

    render(
      <I18nProvider>
        <AppLoadingProvider>
          <AppToastProvider>
            <RouterProvider router={router} />
          </AppToastProvider>
        </AppLoadingProvider>
      </I18nProvider>,
    );

    // The game route is lazy and registers its socket listeners in a promise callback, so
    // nothing can be delivered until it is actually mounted.
    await screen.findByText(/loading game/i);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      socket.simulateConnect();
      socket.serverEmit(ServerToClientEvent.PlayerIdentity, { playerId: TEST_HOST_ID });
      socket.serverEmit(ServerToClientEvent.StateUpdate, { roomState: buildTurnRoomState() });
    });

    expect(socket.listenerCount(ServerToClientEvent.RoomClosed)).toBeGreaterThan(0);

    await act(async () => {
      socket.serverEmit(ServerToClientEvent.RoomClosed, {
        roomId: TEST_ROOM_ID,
        reason: "closed",
      });
    });

    const startButton = await screen.findByRole("button", { name: /lets go/i });
    await user.click(startButton);

    await waitFor(() => expect(router.state.location.pathname).toBe("/play"));
  });
});
