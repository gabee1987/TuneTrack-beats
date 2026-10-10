import { act, fireEvent, render, screen } from "@testing-library/react";
import { BUY_TIMELINE_CARD_TT_COST, SKIP_TRACK_TT_COST } from "@tunetrack/shared/client";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import { TurnActionDock } from "./TurnActionDock";
import dockStyles from "./gamePageActionPanelsDock.module.css";

vi.mock("framer-motion", async (importOriginal) => {
  const { withEagerMotion } = await import("../../../test/stubs/framerMotion");
  return withEagerMotion(await importOriginal<typeof import("framer-motion")>());
});

type TurnActionDockProps = ComponentProps<typeof TurnActionDock>;

function renderDock(overrides: Partial<TurnActionDockProps> = {}) {
  const props: TurnActionDockProps = {
    buyTimelineCardActionStatus: "idle",
    canConfirmTurnPlacement: false,
    canSkipOfflinePlayer: false,
    canUseBuyCard: false,
    canUseSkipTrack: false,
    handleBuyTimelineCardWithTt: vi.fn(),
    handlePlaceCard: vi.fn(),
    handleSkipOfflinePlayer: vi.fn(),
    handleSkipTrackWithTt: vi.fn(),
    isBuyTimelineCardPending: false,
    isPlaceCardPending: false,
    isSkipTrackPending: false,
    isSkipTurnPending: false,
    placeCardActionStatus: "idle",
    skipCandidateName: null,
    skipTrackActionStatus: "idle",
    skipTurnActionStatus: "idle",
    status: "turn",
    turnSkipDeadlineEpochMs: null,
    ...overrides,
  };
  const view = render(
    <I18nProvider>
      <TurnActionDock {...props} />
    </I18nProvider>,
  );
  return { ...view, props };
}

function buttonNames() {
  return screen.getAllByRole("button").map((button) => button.textContent);
}

describe("TurnActionDock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing outside a turn, or on a turn with no action to offer", () => {
    expect(renderDock({ status: "reveal" }).container).toBeEmptyDOMElement();
    expect(renderDock().container).toBeEmptyDOMElement();
  });

  it("lays the confirm button out alone when it is the only action", () => {
    const { props } = renderDock({ canConfirmTurnPlacement: true });

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(buttonNames()).toEqual(["Confirm"]);
    expect(props.handlePlaceCard).toHaveBeenCalledTimes(1);
    expect(document.querySelector(`.${dockStyles.floatingActionDockStacked}`)).toBeNull();
  });

  it("stacks the token actions above a full-width confirm on the player's own turn", () => {
    renderDock({ canConfirmTurnPlacement: true, canUseBuyCard: true, canUseSkipTrack: true });

    const secondaryRow = document.querySelector(`.${dockStyles.floatingActionSecondaryRow}`);
    expect(document.querySelector(`.${dockStyles.floatingActionDockStacked}`)).not.toBeNull();
    expect(secondaryRow?.textContent).toMatch(/^Skip.*Buy/);
    expect(buttonNames().at(-1)).toBe("Confirm");
  });

  it("starts the token animation with each action's cost before spending it", () => {
    const onTokenSpendAnimationStart = vi.fn();
    const { props } = renderDock({
      canUseBuyCard: true,
      canUseSkipTrack: true,
      onTokenSpendAnimationStart,
    });

    fireEvent.click(screen.getByRole("button", { name: /^Skip/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Buy/ }));

    expect(onTokenSpendAnimationStart.mock.calls.map(([payload]) => payload.amount)).toEqual([
      -SKIP_TRACK_TT_COST,
      -BUY_TIMELINE_CARD_TT_COST,
    ]);
    expect(props.handleSkipTrackWithTt).toHaveBeenCalledTimes(1);
    expect(props.handleBuyTimelineCardWithTt).toHaveBeenCalledTimes(1);
  });

  it("names each action's progress and failure", () => {
    renderDock({
      buyTimelineCardActionStatus: "retrying",
      canConfirmTurnPlacement: true,
      canUseBuyCard: true,
      canUseSkipTrack: true,
      placeCardActionStatus: "failed",
      skipTrackActionStatus: "pending",
    });

    expect(buttonNames()).toEqual([
      expect.stringMatching(/^Skipping track/),
      expect.stringMatching(/^No response — retrying/),
      "Try again",
    ]);
  });

  it("shows who the host is waiting for and counts down to the automatic skip", () => {
    vi.useFakeTimers({ now: 0 });
    const { props } = renderDock({
      canSkipOfflinePlayer: true,
      skipCandidateName: "Player One",
      status: "challenge",
      turnSkipDeadlineEpochMs: 3_000,
    });

    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("Auto-skip in 3s")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Auto-skip in 2s")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.queryByText(/Auto-skip/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip Turn" }));
    expect(props.handleSkipOfflinePlayer).toHaveBeenCalledTimes(1);
  });

  it("names an offline player the room no longer knows", () => {
    renderDock({ canSkipOfflinePlayer: true, skipTurnActionStatus: "failed" });

    expect(screen.getByText("Unknown player")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try skipping turn again" })).toBeEnabled();
  });
});
