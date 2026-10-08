import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { readOverlayHistoryIds } from "../overlay/overlayHistory";
import { AppShellMenu } from "./AppShellMenu";
import type { AppShellMenuFooterAction } from "./AppShellMenu.types";

function GameScreen({ footerAction }: { footerAction?: AppShellMenuFooterAction }) {
  return (
    <I18nProvider>
      <AppShellMenu
        {...(footerAction ? { footerAction } : {})}
        subtitle="TEST_ROOM_1"
        tabs={[{ id: "view", label: "View", content: <p>View settings</p> }]}
        title="Settings"
      />
    </I18nProvider>
  );
}

function renderGameRoute(footerAction?: AppShellMenuFooterAction) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Home</p> },
      {
        path: "/game/:roomId",
        element: <GameScreen {...(footerAction ? { footerAction } : {})} />,
      },
    ],
    {
      initialEntries: ["/", "/game/TEST_ROOM_1"],
      initialIndex: 1,
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("AppShellMenu history", () => {
  beforeAll(() => {
    class PassthroughRequest {
      readonly url: string;

      constructor(url: string) {
        this.url = url;
      }
    }
    Reflect.set(globalThis, "Request", PassthroughRequest);
  });

  it("uses browser back to close the menu without leaving the current route", async () => {
    const user = userEvent.setup();
    const router = renderGameRoute();

    await user.click(screen.getByRole("button", { name: "Open game menu" }));
    await screen.findByRole("button", { name: "Close menu" }, { timeout: 5_000 });
    await waitFor(() => {
      expect(readOverlayHistoryIds(router.state.location.state)).toHaveLength(1);
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
    });
    expect(router.state.location.pathname).toBe("/game/TEST_ROOM_1");
  });

  it("closes its history entry before running a footer action", async () => {
    const user = userEvent.setup();
    const openOverlaysWhenActionRan: string[][] = [];
    const action = vi.fn(() => {
      openOverlaysWhenActionRan.push(readOverlayHistoryIds(router.state.location.state));
    });
    const router = renderGameRoute({ label: "Test action", onClick: action });

    await user.click(screen.getByRole("button", { name: "Open game menu" }));
    await user.click(await screen.findByRole("button", { name: "Test action" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(openOverlaysWhenActionRan).toEqual([[]]);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
    });
    expect(router.state.location.pathname).toBe("/game/TEST_ROOM_1");
  });
});
