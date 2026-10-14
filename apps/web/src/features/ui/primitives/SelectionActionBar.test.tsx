import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SelectionActionBar } from "./SelectionActionBar";

vi.mock("../../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

describe("SelectionActionBar", () => {
  it("is absent while nothing is selected", () => {
    renderWithProviders(
      <SelectionActionBar count={0} primaryAction={{ label: "Add to game", onClick: vi.fn() }} />,
    );

    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("shows the count with the primary and destructive actions", async () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    renderWithProviders(
      <SelectionActionBar
        count={3}
        destructiveAction={{ label: "Remove", onClick: onRemove }}
        primaryAction={{ label: "Add to game", onClick: onAdd }}
      />,
    );

    const toolbar = screen.getByRole("toolbar", { name: "3 selected" });
    await userEvent.click(screen.getByRole("button", { name: "Add to game" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(toolbar).toHaveTextContent("3 selected");
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables an action that cannot run", () => {
    renderWithProviders(
      <SelectionActionBar
        count={1}
        primaryAction={{ disabled: true, label: "Add to game", onClick: vi.fn() }}
      />,
    );

    expect(screen.getByRole("button", { name: "Add to game" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
