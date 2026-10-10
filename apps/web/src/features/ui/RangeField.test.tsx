import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { RangeField } from "./RangeField";

function renderRange({ value = 10, disabled = false, onChange = vi.fn() } = {}) {
  renderWithProviders(
    <RangeField
      disabled={disabled}
      label="Cards to win"
      max={12}
      min={8}
      onChange={onChange}
      value={value}
    />,
  );
  return onChange;
}

describe("RangeField", () => {
  it("is a named slider that reports its bounds and value", () => {
    renderRange();

    const slider = screen.getByRole("slider", { name: "Cards to win" });
    expect(slider).toHaveAttribute("aria-valuemin", "8");
    expect(slider).toHaveAttribute("aria-valuemax", "12");
    expect(slider).toHaveAttribute("aria-valuenow", "10");
  });

  it("offers one named tick per value, and a tick picks its value", async () => {
    const onChange = renderRange();

    expect(screen.getAllByRole("button", { name: /^Cards to win: / })).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Cards to win: 12" }));

    expect(onChange).toHaveBeenCalledWith(12);
  });

  it("steps with the arrow keys and stops at the bounds", () => {
    const onChange = renderRange({ value: 12 });
    const slider = screen.getByRole("slider", { name: "Cards to win" });

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "ArrowUp" });

    expect(onChange.mock.calls).toEqual([[11], [12]]);
  });

  it("ignores keys and ticks while disabled and leaves the tab order", async () => {
    const onChange = renderRange({ disabled: true });
    const slider = screen.getByRole("slider", { name: "Cards to win" });

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    await userEvent.click(screen.getByRole("button", { name: "Cards to win: 8" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(slider).toHaveAttribute("tabindex", "-1");
  });
});
