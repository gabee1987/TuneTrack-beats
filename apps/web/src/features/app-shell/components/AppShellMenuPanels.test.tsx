import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hasSeenHint, isHintsEnabled, markHintSeen } from "../../hints/hintState";
import { I18nProvider } from "../../i18n";
import { useAppShellMenuPreferencesState } from "../hooks/useAppShellMenuPreferencesState";
import { AppShellMenuPanels } from "./AppShellMenuPanels";

function MenuPanel({ tabId = "view" }: { tabId?: "settings" | "view" }) {
  const preferencesState = useAppShellMenuPreferencesState();

  return (
    <I18nProvider>
      <AppShellMenuPanels
        activeTab={{ id: tabId, label: tabId, content: null }}
        preferencesState={preferencesState}
      />
    </I18nProvider>
  );
}

describe("AppShellMenuPanels hints settings", () => {
  it("turns all hints off and back on without resetting progress", async () => {
    const user = userEvent.setup();
    markHintSeen("game-drag-preview");

    render(<MenuPanel />);
    const toggle = screen.getByRole("switch", { name: "Show hints" });

    await user.click(toggle);
    expect(isHintsEnabled()).toBe(false);
    expect(hasSeenHint("game-drag-preview")).toBe(true);

    await user.click(toggle);
    expect(isHintsEnabled()).toBe(true);
    expect(hasSeenHint("game-drag-preview")).toBe(true);
  });

  it("makes seen hints eligible again", async () => {
    const user = userEvent.setup();
    markHintSeen("game-drag-preview");
    expect(hasSeenHint("game-drag-preview")).toBe(true);

    render(<MenuPanel />);
    await user.click(screen.getByRole("button", { name: "Reset hints" }));

    expect(hasSeenHint("game-drag-preview")).toBe(false);
    expect(screen.getByText("Hints will appear again when they are relevant.")).toBeVisible();
  });

  it("keeps hint controls in View instead of general Settings", () => {
    const { rerender } = render(<MenuPanel tabId="settings" />);
    expect(screen.queryByRole("heading", { name: "Help and hints" })).not.toBeInTheDocument();

    rerender(<MenuPanel tabId="view" />);
    expect(screen.getByRole("heading", { name: "Help and hints" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reset hints" })).toBeVisible();
  });
});
