import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { I18nProvider } from "../features/i18n";

export const HISTORY_ROUTE_PATH = "/room/TEST_ROOM_1";

/**
 * jsdom's `AbortSignal` is not the one Node's `Request` accepts, and a data router builds a
 * `Request` per navigation; it only reads `url`.
 */
export function installRouterRequestStub(): void {
  class PassthroughRequest {
    readonly url: string;

    constructor(url: string) {
      this.url = url;
    }
  }
  Reflect.set(globalThis, "Request", PassthroughRequest);
}

/**
 * Renders `ui` on a page that has a previous page behind it, so a test can press Back and
 * check that an overlay closed without leaving the page.
 */
export function renderOnHistoryRoute(ui: ReactElement) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Previous page</p> },
      { path: HISTORY_ROUTE_PATH, element: <I18nProvider>{ui}</I18nProvider> },
    ],
    { initialEntries: ["/", HISTORY_ROUTE_PATH], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
}
