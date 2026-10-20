import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import { usePlayerProfileStore } from "../../../features/profile/playerProfile";
import { useHomePageController } from "./useHomePageController";

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  );
}

function renderController() {
  return renderHook(() => ({ controller: useHomePageController(), location: useLocation() }), {
    wrapper: TestWrapper,
  });
}

describe("useHomePageController", () => {
  beforeEach(() => {
    usePlayerProfileStore.setState({ displayName: "Player One", hasCompletedSetup: true });
  });

  it("hosts through the lobby's create route and marks Home as hosting", () => {
    const view = renderController();

    act(() => view.result.current.controller.handleHost());

    expect(view.result.current.location.pathname).toBe("/lobby");
    expect(view.result.current.location.state).toEqual({ intent: "create" });
    expect(view.result.current.controller.isHosting).toBe(true);
  });

  it("holds Host and Join behind the Name sheet on a device without a name", () => {
    usePlayerProfileStore.setState({ displayName: "", hasCompletedSetup: false });
    const view = renderController();

    act(() => view.result.current.controller.handleJoin());

    expect(view.result.current.location.pathname).toBe("/");
    expect(view.result.current.controller.nameSheetProps.isOpen).toBe(true);
    expect(view.result.current.controller.identity).toBeNull();
  });
});
