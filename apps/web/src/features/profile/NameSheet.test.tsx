import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { NameSheet } from "./NameSheet";

vi.mock("../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

function renderSheet(initialName = "") {
  const onSave = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <NameSheet initialName={initialName} isOpen onClose={onClose} onSave={onSave} />,
    { withRouter: false },
  );
  return { onClose, onSave };
}

describe("NameSheet", () => {
  it("asks for the name with the field focused and explains who sees it", () => {
    renderSheet();

    expect(screen.getByRole("dialog", { name: "What should we call you?" })).toHaveTextContent(
      "Everyone in the room sees this name. You can change it any time.",
    );
    expect(screen.getByRole("textbox", { name: "Your name" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("saves the trimmed name on Continue and on Enter", async () => {
    const { onSave } = renderSheet();
    const field = screen.getByRole("textbox", { name: "Your name" });

    await userEvent.type(field, "  Player One  ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.type(field, "{Enter}");

    expect(onSave.mock.calls).toEqual([["Player One"], ["Player One"]]);
  });

  it("starts from the saved name, caps it at 24 characters, and cancels without saving", async () => {
    const { onClose, onSave } = renderSheet("Player One");
    const field = screen.getByRole("textbox", { name: "Your name" });

    expect(field).toHaveValue("Player One");
    expect(field).toHaveAttribute("maxLength", "24");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
