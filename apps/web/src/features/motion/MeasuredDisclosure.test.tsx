import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MeasuredDisclosure } from "./MeasuredDisclosure";

function Panel({ isOpen, label = "Starting tokens" }: { isOpen: boolean; label?: string }) {
  return (
    <MeasuredDisclosure isOpen={isOpen}>
      <button type="button">{label}</button>
    </MeasuredDisclosure>
  );
}

describe("MeasuredDisclosure", () => {
  it("keeps closed content inert and out of the accessibility tree", () => {
    renderWithProviders(<Panel isOpen={false} />);

    const button = screen.getByRole("button", { hidden: true });
    expect(button.closest("[inert]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Starting tokens" })).not.toBeInTheDocument();
  });

  it("shows its content as soon as it opens and keeps it shown across re-renders", () => {
    const view = renderWithProviders(<Panel isOpen={false} />);

    view.rerender(<Panel isOpen />);
    expect(screen.getByRole("button", { name: "Starting tokens" }).closest("[inert]")).toBeNull();

    view.rerender(<Panel isOpen label="Starting songs" />);
    expect(screen.getByRole("button", { name: "Starting songs" })).toBeInTheDocument();
  });
});
