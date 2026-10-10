import { act, fireEvent, render, screen } from "@testing-library/react";
import { CHALLENGE_TT_COST } from "@tunetrack/shared/client";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import { setMediaQuery } from "../../../test/stubs/matchMedia";
import { ChallengeActionPanel } from "./ChallengeActionPanel";
import styles from "./gamePageActionPanelsChallenge.module.css";

vi.mock("framer-motion", async (importOriginal) => {
  const { withEagerMotion } = await import("../../../test/stubs/framerMotion");
  return withEagerMotion(await importOriginal<typeof import("framer-motion")>());
});

const MOBILE_CONTROL_MEDIA_QUERY = "(max-width: 720px), (hover: none) and (pointer: coarse)";

type ChallengeActionPanelProps = ComponentProps<typeof ChallengeActionPanel>;

function renderPanel(overrides: Partial<ChallengeActionPanelProps> = {}) {
  const props: ChallengeActionPanelProps = {
    canClaimChallenge: false,
    canConfirmBeatPlacement: false,
    canResolveChallengeWindow: false,
    challengeActionBody: null,
    challengeActionTitle: null,
    challengeDeadlineEpochMs: null,
    challengePhase: "open",
    claimChallengeActionStatus: "idle",
    currentPlayerTtCount: 2,
    handleClaimChallenge: vi.fn(),
    handlePlaceChallenge: vi.fn(),
    handleResolveChallengeWindow: vi.fn(),
    isClaimChallengePending: false,
    isCurrentPlayerTurn: false,
    isPlaceChallengePending: false,
    isResolveChallengeWindowPending: false,
    placeChallengeActionStatus: "idle",
    resolveChallengeWindowActionStatus: "idle",
    ttModeEnabled: false,
    ...overrides,
  };
  const view = render(
    <I18nProvider>
      <ChallengeActionPanel {...props} />
    </I18nProvider>,
  );
  return { ...view, props };
}

function callout() {
  return screen.getByRole("heading", { level: 3 }).closest("section")!;
}

describe("ChallengeActionPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
    setMediaQuery(MOBILE_CONTROL_MEDIA_QUERY, false);
    window.localStorage.removeItem("tunetrack.language");
  });

  it("renders nothing outside the challenge phase", () => {
    const { container } = renderPanel({ challengePhase: null });

    expect(container).toBeEmptyDOMElement();
  });

  it("invites another player to call Beat! while a timed window counts down", () => {
    vi.useFakeTimers({ now: 0 });
    const { props } = renderPanel({
      canClaimChallenge: true,
      challengeDeadlineEpochMs: 12_000,
      ttModeEnabled: true,
    });

    expect(screen.getByRole("heading", { name: "Call Beat!" })).toBeInTheDocument();
    expect(
      screen.getByText("Spot a bad drop? Call Beat before the timer ends."),
    ).toBeInTheDocument();
    expect(screen.getByText("12s left to call Beat!")).toBeInTheDocument();
    expect(callout()).toHaveTextContent("Your tokens");

    fireEvent.click(screen.getByRole("button", { name: /^Beat!/ }));
    expect(props.handleClaimChallenge).toHaveBeenCalledTimes(1);
  });

  it("turns the callout from yellow through orange to red as the window runs out", () => {
    vi.useFakeTimers({ now: 0 });
    renderPanel({ challengeDeadlineEpochMs: 10_000 });

    expect(callout()).toHaveClass(styles.challengeCalloutStageYellow!);

    act(() => vi.advanceTimersByTime(3_000));
    expect(callout()).toHaveClass(styles.challengeCalloutStageOrange!);

    act(() => vi.advanceTimersByTime(4_000));
    expect(callout()).toHaveClass(styles.challengeCalloutStageRed!);
  });

  it("warms up the same way in Hungarian, whose label has no 's' after the seconds (B28)", async () => {
    window.localStorage.setItem("tunetrack.language", "hu");
    renderPanel({ challengeDeadlineEpochMs: Date.now() + 2_000 });

    expect(await screen.findByText("2 mp maradt Beat! hívásra")).toBeInTheDocument();
    expect(callout()).toHaveClass(styles.challengeCalloutStageRed!);
  });

  it("starts the token animation with the Beat! cost", () => {
    const onTokenSpendAnimationStart = vi.fn();
    renderPanel({ canClaimChallenge: true, onTokenSpendAnimationStart });

    fireEvent.click(screen.getByRole("button", { name: /^Beat!/ }));

    expect(onTokenSpendAnimationStart).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -CHALLENGE_TT_COST }),
    );
  });

  it("tells the active host they close an untimed window, and lets them resolve it", () => {
    const { props } = renderPanel({ canResolveChallengeWindow: true, isCurrentPlayerTurn: true });

    expect(screen.getByRole("heading", { name: "Beat Window Open" })).toBeInTheDocument();
    expect(
      screen.getByText("Your drop is live. You can close Beat! whenever the table is ready."),
    ).toBeInTheDocument();
    expect(screen.getByText("You close this Beat window")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(props.handleResolveChallengeWindow).toHaveBeenCalledTimes(1);
  });

  it("tells an active guest that the host closes an untimed window", () => {
    renderPanel({ isCurrentPlayerTurn: true });

    expect(
      screen.getByText("Your drop is live. Other players can still call Beat! for now."),
    ).toBeInTheDocument();
    expect(screen.getByText("Host closes this Beat window")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the claimed Beat with the caller's copy and the challenger's confirm button", () => {
    const { props } = renderPanel({
      canConfirmBeatPlacement: true,
      challengeActionBody: "Place the card",
      challengeActionTitle: "Beat claimed",
      challengePhase: "claimed",
    });

    expect(screen.getByRole("heading", { name: "Beat claimed" })).toBeInTheDocument();
    expect(screen.getByText("Place the card")).toBeInTheDocument();
    expect(screen.getByText("Beat! was claimed. Waiting for the placement.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Beat" }));
    expect(props.handlePlaceChallenge).toHaveBeenCalledTimes(1);
  });

  it("stacks the callout above its dock in the page on desktop", () => {
    const { container } = renderPanel({ canClaimChallenge: true });

    expect(container.querySelector(`.${styles.challengeActionStack}`)).toContainElement(callout());
  });

  it("portals the callout out of the page on mobile", () => {
    setMediaQuery(MOBILE_CONTROL_MEDIA_QUERY, true);
    const { container } = renderPanel({ canClaimChallenge: true });

    expect(container).not.toContainElement(callout());
    expect(container.querySelector(`.${styles.challengeActionStack}`)).toBeNull();
  });
});
