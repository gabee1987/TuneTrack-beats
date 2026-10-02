import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hasSeenHint, isHintsEnabled, markHintSeen } from "../../hints/hintState";
import { I18nProvider } from "../../i18n";
import { useAppShellMenuPreferencesState } from "../hooks/useAppShellMenuPreferencesState";
import { AppShellMenuPanels } from "./AppShellMenuPanels";

function SettingsPanel() {
  const preferencesState = useAppShellMenuPreferencesState();

  return (
    <I18nProvider>
      <AppShellMenuPanels
        activeTab={{ id: "settings", label: "Settings", content: null }}
        preferencesState={preferencesState}
      />
    </I18nProvider>
  );
}

describe("AppShellMenuPanels hints settings", () => {
  it("turns all hints off and back on without resetting progress", async () => {
    const user = userEvent.setup();
    markHintSeen("game-drag-preview");

    render(<SettingsPanel />);
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

    render(<SettingsPanel />);
    await user.click(screen.getByRole("button", { name: "Reset hints" }));

    expect(hasSeenHint("game-drag-preview")).toBe(false);
    expect(screen.getByText("Hints will appear again when they are relevant.")).toBeVisible();
  });
});
