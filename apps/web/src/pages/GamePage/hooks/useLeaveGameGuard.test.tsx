import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLeaveGameGuard } from "./useLeaveGameGuard";

const isPresentMock = vi.fn(() => true);

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useIsPresent: () => isPresentMock() };
});

vi.mock("../../../services/socket/socketClient", () => ({
  resetSocketClient: vi.fn(),
}));

let guardApi: ReturnType<typeof useLeaveGameGuard> | null = null;
let setGuardedFromTest: ((isGuarded: boolean) => void) | null = null;

function GameScreen({ initialGuarded }: { initialGuarded: boolean }) {
  const [isGuarded, setIsGuarded] = useState(initialGuarded);
  setGuardedFromTest = setIsGuarded;
  guardApi = useLeaveGameGuard({ isGuarded });

  return (
    <div>
      <p data-testid="screen">game</p>
      {guardApi.isConfirmVisible ? <p data-testid="confirm">leave?</p> : null}
    </div>
  );
}

function renderAt(isGuarded: boolean) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p data-testid="screen">home</p> },
      { path: "/game/:roomId", element: <GameScreen initialGuarded={isGuarded} /> },
    ],
    { initialEntries: ["/", "/game/TEST_ROOM_1"], initialIndex: 1 },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("useLeaveGameGuard", () => {
  beforeAll(() => {
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
    isPresentMock.mockReturnValue(true);
    guardApi = null;
    setGuardedFromTest = null;
  });

  it("holds a back navigation out of a running game", async () => {
    const router = renderAt(true);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(screen.getByTestId("confirm")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/game/TEST_ROOM_1");
  });

  it("lets the player through once they confirm", async () => {
    const router = renderAt(true);

    await act(async () => {
      await router.navigate(-1);
    });
    await act(async () => {
      guardApi?.confirmLeave();
    });

    expect(router.state.location.pathname).toBe("/");
  });

  it("does not hold anything once the game is over", async () => {
    const router = renderAt(false);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.pathname).toBe("/");
  });

  /**
   * React Router honours one blocker at a time, so a guard that keeps holding after it stops
   * applying would block every later navigation for the rest of the session — the app looks
   * alive and refuses to change screen. Refusing new navigations is not enough; one already
   * held has to be let go.
   *
   * Driven here by the room ending while the dialog is open. Presence feeds the same
   * `canBlock` input, and framer-motion re-renders on a presence change the way this prop
   * does.
   */
  it("releases a navigation it is already holding once it no longer applies", async () => {
    const router = renderAt(true);

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByTestId("confirm")).toBeTruthy();

    await act(async () => {
      setGuardedFromTest?.(false);
    });

    expect(guardApi?.isConfirmVisible).toBe(false);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.pathname).toBe("/");
  });

  it("never holds anything for a page that is already leaving", async () => {
    isPresentMock.mockReturnValue(false);
    const router = renderAt(true);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.pathname).toBe("/");
  });
});
