import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { AppShellMenu } from "./AppShellMenu";
import type { AppShellMenuTab } from "./AppShellMenu.types";

// `language`, `view`, `settings` and `dev` render built-in panels, so the two tabs that
// assert on caller-supplied content use ids that are not special-cased.
const tabs: AppShellMenuTab[] = [
  { id: "players", label: "Players", content: <p>Player list</p> },
  { id: "history", label: "History", content: <p>Turn history</p> },
  { id: "language", label: "Language", content: null },
];

function renderMenu(overrides: Partial<Parameters<typeof AppShellMenu>[0]> = {}) {
  return renderWithProviders(
    <AppShellMenu subtitle="Test room" tabs={tabs} title="TEST_ROOM_1" {...overrides} />,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: /open game menu/i }));
  return screen.findByRole("dialog");
}

describe("AppShellMenu", () => {
  it("renders only the trigger while closed", () => {
    renderMenu();

    expect(screen.getByRole("button", { name: /open game menu/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the panel and shows the room title", async () => {
    renderMenu();
    await openMenu();

    expect(screen.getByRole("heading", { name: "TEST_ROOM_1" })).toBeInTheDocument();
    expect(screen.getByText("Test room")).toBeInTheDocument();
  });

  it("shows the first tab's content by default", async () => {
    renderMenu();
    await openMenu();

    expect(screen.getByText("Player list")).toBeInTheDocument();
    expect(screen.queryByText("Turn history")).not.toBeInTheDocument();
  });

  it("switches tabs on click", async () => {
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "History" }));

    expect(await screen.findByText("Turn history")).toBeInTheDocument();
    expect(screen.queryByText("Player list")).not.toBeInTheDocument();
  });

  it("renders the built-in language panel for the language tab", async () => {
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Language" }));

    expect(
      await screen.findByRole("heading", { level: 3, name: /language/i }),
    ).toBeInTheDocument();
  });

  it("closes on the close control", async () => {
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: /close menu/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes when the scrim is clicked", async () => {
    renderMenu();
    const dialog = await openMenu();
    const scrim = dialog.parentElement as HTMLElement;

    await userEvent.click(scrim);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not close when the panel itself is clicked", async () => {
    renderMenu();
    const dialog = await openMenu();

    await userEvent.click(dialog);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("runs a footer action and closes the panel", async () => {
    const onClick = vi.fn();
    renderMenu({ footerActions: [{ label: "Close room", onClick, tone: "danger" }] });
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Close room" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renders no footer when there are no actions", async () => {
    renderMenu();
    await openMenu();

    expect(screen.queryByRole("button", { name: "Close room" })).not.toBeInTheDocument();
  });

  /**
   * Defect B5: the panel is behind `Suspense`, so its chunk can resolve *after* the open
   * state is set. `MotionPresence` defaults `initial` to false, which would then skip the
   * enter animation entirely and make the panel pop in. This asserts the boundary opts in.
   */
  it("keeps the enter animation when the chunk resolves after opening", async () => {
    renderMenu();
    const dialog = await openMenu();

    // framer-motion writes the animated properties inline; an opted-out boundary renders
    // straight to the settled state with no transform of its own.
    expect(dialog.getAttribute("style")).toBeTruthy();
  });
});
