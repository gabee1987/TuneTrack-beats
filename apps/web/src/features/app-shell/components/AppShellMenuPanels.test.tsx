import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hasSeenHint, markHintSeen } from "../../hints/hintState";
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
  it("makes seen hints eligible again", async () => {
    const user = userEvent.setup();
    markHintSeen("game-timeline-tap");
    expect(hasSeenHint("game-timeline-tap")).toBe(true);

    render(<SettingsPanel />);
    await user.click(screen.getByRole("button", { name: "Reset hints" }));

    expect(hasSeenHint("game-timeline-tap")).toBe(false);
    expect(screen.getByText("Hints will appear again when they are relevant.")).toBeVisible();
  });
});
