import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import { useHomePageController } from "./useHomePageController";

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  );
}

describe("useHomePageController navigation", () => {
  it("keeps player-name setup off Home and continues to room selection", () => {
    const view = renderHook(
      () => ({ controller: useHomePageController(), location: useLocation() }),
      { wrapper: TestWrapper },
    );

    act(() => view.result.current.controller.handleStart());

    expect(view.result.current.location.pathname).toBe("/play");
  });
});
