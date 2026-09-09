import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n";
import { AppShellMenuDialog } from "./AppShellMenuDialog";
import type { AppShellMenuTab } from "../AppShellMenu.types";

const TABS: AppShellMenuTab[] = [
  { id: "view", label: "View", content: <p>view panel</p> },
];

function renderDialog() {
  return render(
    <I18nProvider>
      <AppShellMenuDialog
        isOpen
        onClose={vi.fn()}
        subtitle="TEST_ROOM_1"
        tabs={TABS}
        title="Settings"
      />
    </I18nProvider>,
  );
}

function queryLayer(selector: string): HTMLElement {
  const element = document.body.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`expected to find ${selector}`);
  }
  return element;
}

describe("AppShellMenuDialog", () => {
  /**
   * Opacity multiplies down the tree. While the scrim wrapped the sheet, animating both
   * showed the page through the panel on the way in and emptied the panel a third of the
   * way through the way out. Both may fade only because they are siblings.
   */
  it("renders the scrim beside the sheet, never around it", () => {
    renderDialog();

    const scrim = queryLayer('[class*="menuScrim"]');
    const sheet = queryLayer('[class*="menuSheet"]');

    expect(scrim.contains(sheet)).toBe(false);
    expect(sheet.contains(scrim)).toBe(false);
    expect(scrim.parentElement).toBe(sheet.parentElement);
  });

  it("puts the menu in a layer of its own on the document body", () => {
    const { container } = renderDialog();

    const layer = queryLayer('[class*="menuLayer"]');

    expect(container.contains(layer)).toBe(false);
    expect(layer.parentElement).toBe(document.body);
  });
});
