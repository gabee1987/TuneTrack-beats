import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PanelView } from "../../overlay";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("is a dialog named by its title with its body and dock", () => {
    renderWithProviders(
      <Sheet
        dock={<button type="button">Use in game</button>}
        isOpen
        onClose={vi.fn()}
        title="Music"
      >
        <p>Pick your songs.</p>
      </Sheet>,
      { withRouter: false },
    );

    const sheet = screen.getByRole("dialog", { name: "Music" });

    expect(screen.getByRole("heading", { name: "Music" })).toBeInTheDocument();
    expect(sheet).toHaveTextContent("Pick your songs.");
    expect(screen.getByRole("button", { name: "Use in game" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  });

  it("closes from its close button and on Escape", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <Sheet isOpen onClose={onClose} title="Music">
        <p>Pick your songs.</p>
      </Sheet>,
      { withRouter: false },
    );

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("offers Done instead of the close button for a sheet that applies changes as they are made", async () => {
    const onClose = vi.fn();
    const onDone = vi.fn();
    renderWithProviders(
      <Sheet isOpen onClose={onClose} onDone={onDone} title="Rules">
        <p>Cards to win</p>
      </Sheet>,
      { withRouter: false },
    );

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hosts a deeper step as a panel view that Escape closes first", async () => {
    const onClose = vi.fn();
    function SheetWithEditor() {
      const [isEditorOpen, setIsEditorOpen] = useState(false);
      return (
        <Sheet isOpen onClose={onClose} title="Music">
          <button onClick={() => setIsEditorOpen(true)} type="button">
            Edit song
          </button>
          <PanelView
            isOpen={isEditorOpen}
            label="Song editor"
            onDismiss={() => setIsEditorOpen(false)}
          >
            <p>Release year</p>
          </PanelView>
        </Sheet>
      );
    }
    renderWithProviders(<SheetWithEditor />, { withRouter: false });

    await userEvent.click(screen.getByRole("button", { name: "Edit song" }));
    const sheet = screen.getByRole("dialog", { name: "Music" });
    expect(sheet).toContainElement(screen.getByRole("dialog", { name: "Song editor" }));

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Song editor" })).not.toBeInTheDocument(),
    );
    expect(sheet).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    renderWithProviders(
      <Sheet isOpen={false} onClose={vi.fn()} title="Music">
        <p>Pick your songs.</p>
      </Sheet>,
      { withRouter: false },
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
