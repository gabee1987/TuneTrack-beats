import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HISTORY_ROUTE_PATH,
  installRouterRequestStub,
  renderOnHistoryRoute,
} from "../../test/renderOnHistoryRoute";
import { Overlay } from "./Overlay";
import { PanelView } from "./PanelView";

function MusicSetup() {
  const [isViewOpen, setIsViewOpen] = useState(false);

  return (
    <Overlay
      isOpen
      kind="sheet"
      label="Music setup"
      onDismiss={() => undefined}
      scrimClassName="setup-scrim"
    >
      <div className="scrolling-body">
        <button onClick={() => setIsViewOpen(true)} type="button">
          Edit playlist
        </button>
        <PanelView
          isOpen={isViewOpen}
          label="Playlist editor"
          onDismiss={() => setIsViewOpen(false)}
        >
          <button type="button">Track one</button>
        </PanelView>
      </div>
    </Overlay>
  );
}

async function openView() {
  const router = renderOnHistoryRoute(<MusicSetup />);
  await userEvent.click(await screen.findByRole("button", { name: "Edit playlist" }));
  await screen.findByRole("dialog", { name: "Playlist editor" });
  return router;
}

function expectOnlyViewClosed() {
  return waitFor(() => {
    expect(screen.queryByRole("dialog", { name: "Playlist editor" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Music setup" })).toBeInTheDocument();
  });
}

describe("PanelView", () => {
  beforeAll(installRouterRequestStub);

  it("opens inside the panel, covering it, not as another sheet with its own scrim", async () => {
    await openView();
    const panel = screen.getByRole("dialog", { name: "Music setup" });
    const view = screen.getByRole("dialog", { name: "Playlist editor" });

    expect(view.parentElement).toBe(panel);
    expect(document.querySelectorAll(".setup-scrim")).toHaveLength(1);
  });

  it("moves focus into the view", async () => {
    await openView();

    expect(screen.getByRole("dialog", { name: "Playlist editor" })).toHaveFocus();
  });

  it("closes one step on Escape", async () => {
    await openView();

    await userEvent.keyboard("{Escape}");

    await expectOnlyViewClosed();
  });

  it("closes one step on a scrim tap", async () => {
    await openView();

    fireEvent.click(document.querySelector(".setup-scrim") as Element);

    await expectOnlyViewClosed();
  });

  it("closes one step on Back without leaving the page", async () => {
    const router = await openView();

    await act(async () => {
      await router.navigate(-1);
    });

    await expectOnlyViewClosed();
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });
});
