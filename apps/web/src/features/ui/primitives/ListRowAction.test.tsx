import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { ListRowAction } from "./ListRowAction";

describe("ListRowAction", () => {
  it("is an icon button named for its row on phones", async () => {
    const onClick = vi.fn();
    renderWithProviders(<ListRowAction aria-label="Add Test Song" kind="add" onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Add Test Song" });
    await userEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toHaveTextContent("Add");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows its word on desktop and reports the added state", () => {
    renderWithProviders(<ListRowAction isLabelVisible kind="added" />);

    const button = screen.getByRole("button", { name: "Added" });

    expect(button).toHaveTextContent("Added");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["remove", "Remove"],
    ["chevron", "Open"],
    ["more", "More"],
  ] as const)("names a %s action %s and is no toggle", (kind, name) => {
    renderWithProviders(<ListRowAction kind={kind} />);

    expect(screen.getByRole("button", { name })).not.toHaveAttribute("aria-pressed");
  });
});
