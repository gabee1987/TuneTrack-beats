import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ToggleSwitch } from "./ToggleSwitch";

describe("ToggleSwitch", () => {
  it("is a named switch that shows its state in words", () => {
    const { rerender } = renderWithProviders(
      <ToggleSwitch ariaLabel="TT mode" checked={false} onChange={() => undefined} />,
    );

    const toggle = screen.getByRole("switch", { name: "TT mode" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveTextContent("Off");

    rerender(<ToggleSwitch ariaLabel="TT mode" checked onChange={() => undefined} />);
    expect(toggle).toBeChecked();
    expect(toggle).toHaveTextContent("On");
  });

  it("uses the labels it is given instead of On and Off", () => {
    renderWithProviders(
      <ToggleSwitch
        ariaLabel="Sound"
        checked
        offLabel="Muted"
        onChange={() => undefined}
        onLabel="Audible"
      />,
    );

    expect(screen.getByRole("switch", { name: "Sound" })).toHaveTextContent("Audible");
  });

  it("asks for the opposite state when pressed", async () => {
    const onChange = vi.fn();
    renderWithProviders(<ToggleSwitch ariaLabel="TT mode" checked onChange={onChange} />);

    await userEvent.click(screen.getByRole("switch", { name: "TT mode" }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("ignores presses while disabled", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ToggleSwitch ariaLabel="TT mode" checked={false} disabled onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "TT mode" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
