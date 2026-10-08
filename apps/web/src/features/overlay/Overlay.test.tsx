import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HISTORY_ROUTE_PATH,
  installRouterRequestStub,
  renderOnHistoryRoute,
} from "../../test/renderOnHistoryRoute";
import { Overlay } from "./Overlay";

function NestedOverlays({ isInnerDismissible = true }: { isInnerDismissible?: boolean }) {
  const [isOuterOpen, setIsOuterOpen] = useState(false);
  const [isInnerOpen, setIsInnerOpen] = useState(false);

  return (
    <main>
      <p>Room screen</p>
      <button onClick={() => setIsOuterOpen(true)} type="button">
        Open outer
      </button>
      <Overlay
        isOpen={isOuterOpen}
        kind="sheet"
        label="Outer sheet"
        onDismiss={() => setIsOuterOpen(false)}
        scrimClassName="outer-scrim"
      >
        <button onClick={() => setIsInnerOpen(true)} type="button">
          Open inner
        </button>
        <Overlay
          dismissible={isInnerDismissible}
          isOpen={isInnerOpen}
          label="Inner dialog"
          onDismiss={() => setIsInnerOpen(false)}
          scrimClassName="inner-scrim"
        >
          <button onClick={() => setIsInnerOpen(false)} type="button">
            Done
          </button>
        </Overlay>
      </Overlay>
    </main>
  );
}

function renderInRouter(isInnerDismissible = true) {
  return renderOnHistoryRoute(<NestedOverlays isInnerDismissible={isInnerDismissible} />);
}

async function openBoth() {
  await userEvent.click(screen.getByRole("button", { name: "Open outer" }));
  await userEvent.click(await screen.findByRole("button", { name: "Open inner" }));
  await screen.findByRole("dialog", { name: "Inner dialog" });
}

function expectOnlyOuterOpen() {
  return waitFor(() => {
    expect(screen.queryByRole("dialog", { name: "Inner dialog" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Outer sheet" })).toBeInTheDocument();
  });
}

describe("Overlay (plan 14 §4)", () => {
  beforeAll(installRouterRequestStub);

  it("closes only the topmost overlay on Escape", async () => {
    renderInRouter();
    await openBoth();

    await userEvent.keyboard("{Escape}");

    await expectOnlyOuterOpen();
  });

  it("closes only the topmost overlay on a scrim tap", async () => {
    renderInRouter();
    await openBoth();

    fireEvent.click(document.querySelector(".inner-scrim") as Element);

    await expectOnlyOuterOpen();
  });

  it("closes only the topmost overlay on Back and stays on the page", async () => {
    const router = renderInRouter();
    await openBoth();

    await act(async () => {
      await router.navigate(-1);
    });

    await expectOnlyOuterOpen();
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Outer sheet" })).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
    expect(screen.getByText("Room screen")).toBeInTheDocument();
  });

  it("pops its history entry when closed by a button, so Back then closes the next layer", async () => {
    const router = renderInRouter();
    await openBoth();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await expectOnlyOuterOpen();

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Outer sheet" })).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });

  it("ignores Escape and scrim taps on a non-dismissible overlay, and leaves the one below", async () => {
    renderInRouter(false);
    await openBoth();

    await userEvent.keyboard("{Escape}");
    fireEvent.click(document.querySelector(".inner-scrim") as Element);

    expect(screen.getByRole("dialog", { name: "Inner dialog" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Outer sheet" })).toBeInTheDocument();
  });

  it("stacks a nested overlay above its parent", async () => {
    renderInRouter();
    await openBoth();

    expect((document.querySelector(".outer-scrim") as HTMLElement).style.zIndex).toBe(
      "var(--z-sheet)",
    );
    expect((document.querySelector(".inner-scrim") as HTMLElement).style.zIndex).toBe(
      "var(--z-dialog-nested)",
    );
  });

  it("moves focus into the panel and returns it to the trigger on close", async () => {
    renderInRouter();
    const trigger = screen.getByRole("button", { name: "Open outer" });

    await userEvent.click(trigger);
    const panel = await screen.findByRole("dialog", { name: "Outer sheet" });
    expect(panel).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Outer sheet" })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("keeps Tab inside the topmost panel", async () => {
    renderInRouter();
    await openBoth();

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
  });

  it("locks page scrolling while any overlay is open and restores it after", async () => {
    document.body.style.overflow = "auto";
    renderInRouter();
    await openBoth();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    await expectOnlyOuterOpen();
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(document.body.style.overflow).toBe("auto");
    });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("works without a router: no history entry, Escape still closes", async () => {
    render(<NestedOverlays />);

    await userEvent.click(screen.getByRole("button", { name: "Open outer" }));
    await screen.findByRole("dialog", { name: "Outer sheet" });
    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Outer sheet" })).not.toBeInTheDocument();
    });
  });
});
