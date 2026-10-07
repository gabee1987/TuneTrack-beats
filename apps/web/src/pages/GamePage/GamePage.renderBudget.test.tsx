import { ServerToClientEvent, type PublicRoomState } from "@tunetrack/shared";
import { act, render, screen } from "@testing-library/react";
import { memo, type ComponentProps } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../features/i18n";
import { AppLoadingProvider } from "../../features/loading";
import { usePlayerProfileStore } from "../../features/profile/playerProfile";
import { AppToastProvider } from "../../features/toast";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../test/fakeSocket";
import {
  buildPlayer,
  buildRoomSettings,
  buildTurnRoomState,
  TEST_GUEST_ID,
  TEST_HOST_ID,
  TEST_ROOM_ID,
} from "../../test/roomStateFixtures";
import { useMobileViewport } from "../../test/stubs/viewport";
import { GamePage } from "./GamePage";

const renderCounts = vi.hoisted(() => ({ actionPanels: 0, header: 0, timelineItems: 0 }));

vi.mock("../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

// The header and the action panels always render these children and neither child is
// memoised, so each child render is one render of its parent.
vi.mock("./components/HeaderLeadersStrip", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./components/HeaderLeadersStrip")>();
  return {
    HeaderLeadersStrip: (props: ComponentProps<typeof actual.HeaderLeadersStrip>) => {
      renderCounts.header += 1;
      return <actual.HeaderLeadersStrip {...props} />;
    },
  };
});

vi.mock("./components/FinishedStatePanel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./components/FinishedStatePanel")>();
  return {
    FinishedStatePanel: (props: ComponentProps<typeof actual.FinishedStatePanel>) => {
      renderCounts.actionPanels += 1;
      return <actual.FinishedStatePanel {...props} />;
    },
  };
});

// Same shallow comparison as the real `memo(TimelinePanelItemsComponent)`.
vi.mock("./components/TimelinePanelItems", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./components/TimelinePanelItems")>();
  return {
    TimelinePanelItems: memo((props: ComponentProps<typeof actual.TimelinePanelItems>) => {
      renderCounts.timelineItems += 1;
      return <actual.TimelinePanelItems {...props} />;
    }),
  };
});

const socket = getSharedFakeSocket();

function buildRoomStateWithGuestTokens(guestTokenCount: number): PublicRoomState {
  return buildTurnRoomState({
    players: [
      buildPlayer({ id: TEST_HOST_ID, ttTokenCount: 2 }),
      buildPlayer({
        id: TEST_GUEST_ID,
        displayName: "Player Two",
        isHost: false,
        ttTokenCount: guestTokenCount,
      }),
    ],
    settings: buildRoomSettings({ ttModeEnabled: true }),
  });
}

function renderGamePage() {
  const router = createMemoryRouter([{ path: "/game/:roomId", element: <GamePage /> }], {
    initialEntries: [`/game/${TEST_ROOM_ID}`],
  });
  render(
    <I18nProvider>
      <AppLoadingProvider>
        <AppToastProvider>
          <RouterProvider router={router} />
        </AppToastProvider>
      </AppLoadingProvider>
    </I18nProvider>,
  );
}

describe("game page render budget (05 §2.2)", () => {
  beforeEach(() => {
    resetSharedFakeSocket();
    useMobileViewport();
    usePlayerProfileStore.getState().setDisplayName("Player One");
    renderCounts.actionPanels = 0;
    renderCounts.header = 0;
    renderCounts.timelineItems = 0;
  });

  // Loads the lazy mobile assembly for real, so it needs more than the default budget.
  it(
    "re-renders only the header when another player's tokens change",
    { timeout: 30_000 },
    async () => {
      renderGamePage();
      // The socket listeners are registered in a promise callback after mount.
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        socket.simulateConnect();
        socket.serverEmit(ServerToClientEvent.PlayerIdentity, { playerId: TEST_HOST_ID });
        socket.serverEmit(ServerToClientEvent.StateUpdate, {
          roomState: buildRoomStateWithGuestTokens(0),
        });
      });
      await screen.findByRole("banner", undefined, { timeout: 10_000 });
      expect(renderCounts.timelineItems).toBeGreaterThan(0);
      renderCounts.actionPanels = 0;
      renderCounts.header = 0;
      renderCounts.timelineItems = 0;

      await act(async () => {
        socket.serverEmit(ServerToClientEvent.StateUpdate, {
          roomState: buildRoomStateWithGuestTokens(1),
        });
      });

      // The leaders strip in the header shows the changed token count; nothing the action
      // panels or the timeline show changed.
      expect(renderCounts).toEqual({ actionPanels: 0, header: 1, timelineItems: 0 });
    },
  );
});
