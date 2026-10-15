import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { DesignSystemPage } from "./DesignSystemPage";

describe("DesignSystemPage", () => {
  it("renders every gallery group without errors", () => {
    renderWithProviders(<DesignSystemPage />, { route: "/dev/ui" });

    for (const group of ["Primitives", "Lobby", "Feedback & game", "Controls"]) {
      expect(screen.getByRole("heading", { level: 2, name: group })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Text field" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Tokens" })).toBeInTheDocument();
    expect(screen.getAllByRole("meter", { name: "Songs in the deck" }).length).toBeGreaterThan(0);
  });
});
