import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { BottomSheet } from "./BottomSheet";

function renderSheet({ isOpen = true, onClose = vi.fn() } = {}) {
  renderWithProviders(
    <BottomSheet isOpen={isOpen} label="Music setup" onClose={onClose}>
      <button type="button">Import playlist</button>
    </BottomSheet>,
    { withRouter: false },
  );
  return onClose;
}

describe("BottomSheet", () => {
  it("is a dialog named by its label that holds its content", () => {
    renderSheet();

    const sheet = screen.getByRole("dialog", { name: "Music setup" });
    expect(sheet).toContainElement(screen.getByRole("button", { name: "Import playlist" }));
  });

  it("renders nothing while closed", () => {
    renderSheet({ isOpen: false });

    expect(screen.queryByRole("dialog", { name: "Music setup" })).not.toBeInTheDocument();
  });

  it("asks to close on Escape", () => {
    const onClose = renderSheet();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
