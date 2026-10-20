import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { Dialog } from "./Dialog";

function ConfirmRemove({ onRemove }: { onRemove: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">
        Remove Player Two
      </button>
      <Dialog
        actions={
          <button onClick={onRemove} type="button">
            Remove
          </button>
        }
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Remove Player Two from the room?"
      >
        <p>They can join again with the code.</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("is a dialog named by its title, with its body and actions", async () => {
    const onRemove = vi.fn();
    renderWithProviders(<ConfirmRemove onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Player Two" }));
    const dialog = await screen.findByRole("dialog", { name: "Remove Player Two from the room?" });

    expect(dialog).toHaveTextContent("They can join again with the code.");
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the close button", () => userEvent.click(screen.getByRole("button", { name: "Close" }))],
    ["Escape", () => userEvent.keyboard("{Escape}")],
  ])("closes from %s and returns focus to what opened it", async (_way, close) => {
    renderWithProviders(<ConfirmRemove onRemove={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Remove Player Two" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");

    await close();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
