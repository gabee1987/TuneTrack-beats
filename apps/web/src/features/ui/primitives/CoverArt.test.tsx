import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { CoverArt, getCoverInitials } from "./CoverArt";

const COVER_1 = "https://images.example.test/cover-1.jpg";
const COVER_2 = "https://images.example.test/cover-2.jpg";
const COVER_3 = "https://images.example.test/cover-3.jpg";
const COVER_4 = "https://images.example.test/cover-4.jpg";

function listImages(container: HTMLElement) {
  return [...container.querySelectorAll("img")].map((image) => image.getAttribute("src"));
}

describe("CoverArt", () => {
  it("loads the cover lazily and stays hidden from assistive technology without alt text", () => {
    const { container } = renderWithProviders(<CoverArt label="Test Playlist" src={COVER_1} />);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("is one named image when given alt text", () => {
    renderWithProviders(<CoverArt alt="Test Playlist cover" label="Test Playlist" src={COVER_1} />);

    expect(screen.getByRole("img", { name: "Test Playlist cover" })).toBeInTheDocument();
  });

  it("shows initials instead of a missing or broken cover", () => {
    const { container, rerender } = renderWithProviders(<CoverArt label="Test Playlist" />);
    expect(container).toHaveTextContent("TP");

    rerender(<CoverArt label="Party Mix" src={COVER_1} />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    expect(listImages(container)).toEqual([]);
    expect(container).toHaveTextContent("PM");
  });

  it("tiles four covers and falls back to the first when fewer are left", () => {
    const { container } = renderWithProviders(
      <CoverArt label="Test Playlist" mosaic={[COVER_1, COVER_2, COVER_3, COVER_4, COVER_1]} />,
    );
    expect(listImages(container)).toEqual([COVER_1, COVER_2, COVER_3, COVER_4]);

    fireEvent.error(container.querySelectorAll("img")[3] as HTMLImageElement);

    expect(listImages(container)).toEqual([COVER_1]);
  });

  it.each([
    ["Test Playlist", "TP"],
    ["  rock   classics 1980 ", "RC"],
    ["(Live!)", "L"],
    ["!!!", "♪"],
  ])("draws initials for %j as %s", (label, initials) => {
    expect(getCoverInitials(label)).toBe(initials);
  });
});
