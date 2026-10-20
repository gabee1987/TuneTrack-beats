import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { NumberStepper } from "./NumberStepper";

function StepperHarness({
  initialValue = 10,
  isEditable = false,
  onChange = () => undefined,
}: {
  initialValue?: number;
  isEditable?: boolean;
  onChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <NumberStepper
      isEditable={isEditable}
      label="Cards to win"
      max={30}
      min={3}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      value={value}
    />
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("NumberStepper", () => {
  it("steps by one per tap and reports the value", async () => {
    renderWithProviders(<StepperHarness />);

    await userEvent.click(screen.getByRole("button", { name: "Increase Cards to win" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase Cards to win" }));
    await userEvent.click(screen.getByRole("button", { name: "Decrease Cards to win" }));

    expect(screen.getByRole("spinbutton", { name: "Cards to win" })).toHaveAttribute(
      "aria-valuenow",
      "11",
    );
  });

  it("disables the button at each end of the range", () => {
    const { unmount } = renderWithProviders(<StepperHarness initialValue={3} />);

    expect(screen.getByRole("button", { name: "Decrease Cards to win" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase Cards to win" })).toBeEnabled();
    unmount();

    renderWithProviders(<StepperHarness initialValue={30} />);
    expect(screen.getByRole("button", { name: "Increase Cards to win" })).toBeDisabled();
  });

  it("repeats while held and stops at the maximum without a step on release", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<StepperHarness initialValue={26} onChange={onChange} />);
    const increase = screen.getByRole("button", { name: "Increase Cards to win" });

    fireEvent.pointerDown(increase);
    act(() => vi.advanceTimersByTime(399));
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1 + 80 * 6));
    fireEvent.pointerUp(increase);
    fireEvent.click(increase);

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([27, 28, 29, 30]);
    expect(screen.getByRole("spinbutton", { name: "Cards to win" })).toHaveAttribute(
      "aria-valuenow",
      "30",
    );
  });

  it("follows the arrow, Home and End keys within the range", () => {
    renderWithProviders(<StepperHarness />);
    const value = screen.getByRole("spinbutton", { name: "Cards to win" });

    fireEvent.keyDown(value, { key: "ArrowUp" });
    expect(value).toHaveAttribute("aria-valuenow", "11");
    fireEvent.keyDown(value, { key: "End" });
    expect(value).toHaveAttribute("aria-valuenow", "30");
    fireEvent.keyDown(value, { key: "Home" });
    expect(value).toHaveAttribute("aria-valuenow", "3");
  });

  it("applies a typed value on Enter, clamped to the range, when editable", async () => {
    const onChange = vi.fn();
    renderWithProviders(<StepperHarness isEditable onChange={onChange} />);
    const input = screen.getByRole("spinbutton", { name: "Cards to win" });

    await userEvent.clear(input);
    await userEvent.type(input, "1");
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.type(input, "5{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(15);

    await userEvent.clear(input);
    await userEvent.type(input, "99");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(30);
    expect(input).toHaveValue(30);
  });

  it("applies a typed value inside the range at once, before any blur", async () => {
    const onChange = vi.fn();
    renderWithProviders(<StepperHarness isEditable onChange={onChange} />);
    const input = screen.getByRole("spinbutton", { name: "Cards to win" });

    await userEvent.clear(input);
    await userEvent.type(input, "12");

    expect(onChange).toHaveBeenLastCalledWith(12);
    expect(input).toHaveFocus();
  });
});
