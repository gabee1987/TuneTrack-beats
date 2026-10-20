import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SettingRow } from "./SettingRow";

describe("SettingRow", () => {
  it("groups its control under its title and description", () => {
    renderWithProviders(
      <SettingRow description="The first to collect this many cards wins." title="Cards to win">
        <button type="button">10</button>
      </SettingRow>,
    );

    const row = screen.getByRole("group", { name: "Cards to win" });

    expect(row).toHaveAccessibleDescription("The first to collect this many cards wins.");
    expect(row).toContainElement(screen.getByRole("button", { name: "10" }));
  });

  it("has no description when none is given", () => {
    renderWithProviders(
      <SettingRow title="Who confirms the reveal">
        <button type="button">Host</button>
      </SettingRow>,
    );

    expect(screen.getByRole("group", { name: "Who confirms the reveal" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
