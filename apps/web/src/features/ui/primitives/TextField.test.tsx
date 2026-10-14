import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("is a text box named by its label and described by its helper", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TextField
        autoCapitalize="characters"
        helper="Ask the host for the code."
        label="Room code"
        onChange={onChange}
        value=""
      />,
    );

    const input = screen.getByRole("textbox", { name: "Room code" });
    await userEvent.type(input, "A");

    expect(input).toHaveAccessibleDescription("Ask the host for the code.");
    expect(input).toHaveAttribute("autocapitalize", "characters");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("replaces the helper with an announced error and marks the box invalid", () => {
    renderWithProviders(
      <TextField
        error="No room with this code."
        helper="Ask the host for the code."
        label="Room code"
        readOnly
        value="TEST_ROOM_1"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Room code" });

    expect(screen.getByRole("alert")).toHaveTextContent("No room with this code.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("No room with this code.");
    expect(screen.queryByText("Ask the host for the code.")).not.toBeInTheDocument();
  });

  it("renders a trailing control beside the box", () => {
    renderWithProviders(
      <TextField
        label="Room code"
        readOnly
        trailing={<button type="button">Paste</button>}
        value=""
      />,
    );

    expect(screen.getByRole("button", { name: "Paste" })).toBeInTheDocument();
  });
});
