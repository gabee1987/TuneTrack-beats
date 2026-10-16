import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SelectionActionBar } from "./SelectionActionBar";

vi.mock("../../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

describe("SelectionActionBar", () => {
  it("is absent while nothing is selected", () => {
    renderWithProviders(
      <SelectionActionBar actions={[{ label: "Add 0", onClick: vi.fn() }]} count={0} />,
    );

    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("offers each action as its own button, named with the count", async () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    renderWithProviders(
      <SelectionActionBar
        actions={[
          { label: "Add 2", onClick: onAdd },
          { label: "Remove 1", onClick: onRemove, variant: "danger" },
        ]}
        count={3}
      />,
    );

    expect(screen.getByRole("toolbar", { name: "3 selected" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add 2" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove 1" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables an action that cannot run", () => {
    renderWithProviders(
      <SelectionActionBar
        actions={[{ disabled: true, label: "Add 1", onClick: vi.fn() }]}
        count={1}
      />,
    );

    expect(screen.getByRole("button", { name: "Add 1" })).toBeDisabled();
  });
});
