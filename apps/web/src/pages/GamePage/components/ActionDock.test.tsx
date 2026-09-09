import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionDock } from "./ActionDock";
import { setMediaQuery } from "../../../test/stubs/matchMedia";

const MOBILE_CONTROL_MEDIA_QUERY = "(max-width: 720px), (hover: none) and (pointer: coarse)";

const isPresentMock = vi.fn(() => true);

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useIsPresent: () => isPresentMock() };
});

function renderPortaledDock() {
  setMediaQuery(MOBILE_CONTROL_MEDIA_QUERY, true);
  const { container } = render(<ActionDock>dock content</ActionDock>);
  return container;
}

describe("ActionDock", () => {
  afterEach(() => {
    isPresentMock.mockReturnValue(true);
    setMediaQuery(MOBILE_CONTROL_MEDIA_QUERY, false);
  });

  it("portals the dock out of the page on mobile", () => {
    const container = renderPortaledDock();

    expect(document.body.textContent).toContain("dock content");
    expect(container.textContent).not.toContain("dock content");
  });

  /**
   * The portal escapes the page's exit transform, and the dock's exit only fades it to
   * `opacity: 0` — which still receives taps. Left mounted it sits invisibly over the next
   * screen's primary action (defect B10), so it must go the moment the page starts leaving.
   */
  it("renders nothing once the page it belongs to starts exiting", () => {
    isPresentMock.mockReturnValue(false);

    const container = renderPortaledDock();

    expect(document.body.textContent).not.toContain("dock content");
    expect(container.textContent).not.toContain("dock content");
  });
});
