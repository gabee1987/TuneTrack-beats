import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { ListSkeleton } from "./ListRowSkeleton";

describe("ListSkeleton", () => {
  it("is one busy status announced as loading, with its rows hidden", () => {
    const { container } = renderWithProviders(<ListSkeleton count={4} trailing="action" />);

    const list = screen.getByRole("status", { name: "Loading…" });

    expect(list).toHaveAttribute("aria-busy", "true");
    expect(list.children).toHaveLength(4);
    expect([...list.children].every((row) => row.getAttribute("aria-hidden") === "true")).toBe(
      true,
    );
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("leaves out the subtitle line and the leading shape when the real row has none", () => {
    renderWithProviders(<ListSkeleton count={1} hasSubtitle={false} leading="none" />);

    const row = screen.getByRole("status").firstElementChild as HTMLElement;

    expect(row.querySelectorAll("span[aria-hidden]")).toHaveLength(1);
  });
});
