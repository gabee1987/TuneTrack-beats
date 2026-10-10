import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { TEST_GUEST_ID, TEST_HOST_ID, TEST_ROOM_ID } from "../../../test/roomStateFixtures";
import type { GamePageHeaderModel } from "../GamePage.types";
import { GamePageHeader } from "./GamePageHeader";

function buildHeaderModel(overrides: Partial<GamePageHeaderModel> = {}): GamePageHeaderModel {
  return {
    closeRoomActionStatus: "idle",
    currentPlayerId: TEST_HOST_ID,
    handleCloseRoom: vi.fn(),
    handleSkipTurn: vi.fn(),
    hostId: TEST_HOST_ID,
    isCloseRoomPending: false,
    isSkipTurnPending: false,
    leadingPlayers: [],
    menuTabs: [],
    roomId: TEST_ROOM_ID,
    showMiniStandings: false,
    showPhaseChip: false,
    showRoomCodeChip: false,
    showTimelineHints: false,
    showTurnNumberChip: false,
    skipTurnActionStatus: "idle",
    status: "turn",
    statusBadgeText: "Your turn",
    statusDetailText: "Place the song on your timeline",
    ttModeEnabled: false,
    turnNumber: 3,
    updateViewPreferences: vi.fn(),
    visibleTimelineCardCount: 1,
    visibleTimelinePlayerId: TEST_HOST_ID,
    visibleTimelineTitle: "Player One",
    visibleTimelineTtCount: 2,
    ...overrides,
  };
}

function renderHeader(overrides: Partial<GamePageHeaderModel> = {}) {
  const model = buildHeaderModel(overrides);
  renderWithProviders(<GamePageHeader model={model} />);
  return model;
}

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Open game menu" }));
  await screen.findByRole("dialog");
}

describe("GamePageHeader", () => {
  it("shows whose timeline is visible with its card count, and the host marker", () => {
    renderHeader();

    expect(screen.getByRole("banner")).toHaveTextContent("Player One");
    expect(screen.getByLabelText("1 card")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
  });

  it("adds the token count only in TT mode", () => {
    renderHeader({ ttModeEnabled: true, visibleTimelineCardCount: 4 });

    expect(screen.getByLabelText("4 cards")).toBeInTheDocument();
    expect(screen.getByLabelText("2 TT tokens")).toBeInTheDocument();
  });

  it("leaves out the host marker and tokens on a guest's timeline", () => {
    renderHeader({ visibleTimelinePlayerId: TEST_GUEST_ID, visibleTimelineTitle: "Player Two" });

    expect(screen.queryByText("Host")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/TT token/)).not.toBeInTheDocument();
  });

  it("shows only the chips the player switched on", () => {
    const { rerender } = renderWithProviders(<GamePageHeader model={buildHeaderModel()} />);
    expect(screen.queryByText(`Room ${TEST_ROOM_ID}`)).not.toBeInTheDocument();

    rerender(
      <GamePageHeader
        model={buildHeaderModel({
          showPhaseChip: true,
          showRoomCodeChip: true,
          showTurnNumberChip: true,
          status: "challenge",
        })}
      />,
    );

    expect(screen.getByText(`Room ${TEST_ROOM_ID}`)).toBeInTheDocument();
    expect(screen.getByText("Challenge")).toBeInTheDocument();
    expect(screen.getByText("Turn 3")).toBeInTheDocument();
  });

  it("shows the status caption only with timeline hints on", () => {
    const { rerender } = renderWithProviders(<GamePageHeader model={buildHeaderModel()} />);
    expect(screen.queryByText("Place the song on your timeline")).not.toBeInTheDocument();

    rerender(<GamePageHeader model={buildHeaderModel({ showTimelineHints: true })} />);
    expect(screen.getByText("Place the song on your timeline")).toBeInTheDocument();
  });

  it("toggles the leaderboard through the view preferences", async () => {
    const model = renderHeader({ showMiniStandings: true });

    await userEvent.click(screen.getByRole("button", { name: "Hide leaderboard" }));

    expect(model.updateViewPreferences).toHaveBeenCalledWith({ showMiniStandings: false });
  });

  describe("menu actions", () => {
    it.each([
      ["Skip Turn", "handleSkipTurn"],
      ["Close Room", "handleCloseRoom"],
    ] as const)(
      "lets the host %s during a turn, once the menu has closed",
      async (name, handler) => {
        const model = renderHeader();
        await openMenu();

        await userEvent.click(screen.getByRole("button", { name }));

        await waitFor(() => expect(model[handler]).toHaveBeenCalledTimes(1));
      },
    );

    it("offers no Skip Turn outside a turn", async () => {
      renderHeader({ status: "reveal" });
      await openMenu();

      expect(screen.queryByRole("button", { name: "Skip Turn" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close Room" })).toBeInTheDocument();
    });

    it("offers a guest no host actions", async () => {
      renderHeader({ currentPlayerId: TEST_GUEST_ID });
      await openMenu();

      expect(screen.queryByRole("button", { name: "Close Room" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Skip Turn" })).not.toBeInTheDocument();
    });

    it.each([
      ["pending", "Closing room..."],
      ["retrying", "No response — retrying..."],
      ["failed", "Try again"],
    ] as const)("names Close Room by its %s state", async (closeRoomActionStatus, label) => {
      renderHeader({ closeRoomActionStatus, status: "reveal" });
      await openMenu();

      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });

    it.each([
      ["retrying", "No response — retrying..."],
      ["failed", "Try skipping turn again"],
    ] as const)("names Skip Turn by its %s state", async (skipTurnActionStatus, label) => {
      renderHeader({ skipTurnActionStatus });
      await openMenu();

      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });

    it("disables a pending action", async () => {
      renderHeader({ isCloseRoomPending: true, isSkipTurnPending: true });
      await openMenu();

      expect(screen.getByRole("button", { name: "Skip Turn" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Close Room" })).toBeDisabled();
    });
  });
});
