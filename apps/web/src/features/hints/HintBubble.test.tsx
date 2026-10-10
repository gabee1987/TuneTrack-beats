import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { setElementBox } from "../../test/stubs/layout";
import { renderWithProviders } from "../../test/renderWithProviders";
import { HintBubble } from "./HintBubble";

/** The mobile viewport `renderWithProviders` sets is 390 × 844. */
function createAnchor(box: { x: number; y: number; width?: number; height?: number }) {
  const anchor = document.createElement("button");
  document.body.append(anchor);
  setElementBox(anchor, { width: 40, height: 40, ...box });
  return anchor;
}

function renderBubble(anchor: HTMLElement, onDismiss = vi.fn()) {
  renderWithProviders(
    <>
      <p>Outside the hint</p>
      <HintBubble
        anchor={anchor}
        body="This is the name everyone in the room will see."
        dismissLabel="Dismiss hint"
        onDismiss={onDismiss}
        title="Choose your player name"
      />
    </>,
  );
  return onDismiss;
}

describe("HintBubble", () => {
  it("is a dialog named by its title and described by its body", () => {
    renderBubble(createAnchor({ x: 100, y: 100 }));

    expect(
      screen.getByRole("dialog", {
        name: "Choose your player name",
        description: "This is the name everyone in the room will see.",
      }),
    ).toBeInTheDocument();
  });

  it("dismisses from its button, on Escape and on a tap outside, but not on a tap inside", async () => {
    const onDismiss = renderBubble(createAnchor({ x: 100, y: 100 }));

    fireEvent.pointerDown(screen.getByText("This is the name everyone in the room will see."));
    expect(onDismiss).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(screen.getByText("Outside the hint"));

    expect(onDismiss).toHaveBeenCalledTimes(3);
  });

  it("opens below an anchor with room underneath, centred on it", () => {
    renderBubble(createAnchor({ x: 175, y: 100 }));

    const bubble = screen.getByRole("dialog");
    expect(bubble).toHaveAttribute("data-placement", "below");
    expect(bubble).toHaveStyle({ left: "195px", top: "152px" });
  });

  it("opens above an anchor near the bottom edge and stays inside the side gutter", () => {
    renderBubble(createAnchor({ x: 0, y: 780 }));

    const bubble = screen.getByRole("dialog");
    expect(bubble).toHaveAttribute("data-placement", "above");
    expect(bubble).toHaveStyle({ left: "156px", top: "768px" });
  });
});
