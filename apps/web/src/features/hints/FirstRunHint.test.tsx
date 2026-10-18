import { act, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerOverlay } from "../overlay/overlayStore";
import { triggerIntersection } from "../../test/stubs/observers";
import { renderWithProviders } from "../../test/renderWithProviders";
import { FirstRunHint } from "./FirstRunHint";
import { pauseHints, showHintsAgain } from "./hintCoordinator";
import { type HintId, markHintSeen, readHintState, setHintsEnabled } from "./hintState";

const HINT_DELAY_MS = 1_500;
const TITLES = {
  "lobby-music": "Pick your songs",
  "lobby-share-code": "Invite your friends",
  "lobby-start": "Start when everyone is ready",
} as const;
type TestHintId = keyof typeof TITLES;

function Hint({ id, isEligible = true }: { id: TestHintId; isEligible?: boolean }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <button ref={setAnchor} type="button">
        {id}
      </button>
      <FirstRunHint anchor={anchor} id={id} isEligible={isEligible} />
    </>
  );
}

function renderHints(ids: TestHintId[], { isOnScreen = true } = {}) {
  const view = renderWithProviders(
    <>
      {ids.map((id) => (
        <Hint id={id} key={id} />
      ))}
    </>,
  );
  if (isOnScreen) act(() => triggerIntersection(true));
  return view;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function hintFor(id: TestHintId) {
  return screen.queryByRole("status", { name: TITLES[id] });
}

function isSeen(id: HintId): boolean {
  return (readHintState().seenCounts[id] ?? 0) > 0;
}

function dismiss() {
  fireEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));
}

describe("FirstRunHint, the first-game tutorial", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 1.5 s, and counts a hint as seen only once it is acknowledged", () => {
    renderHints(["lobby-start"]);

    advance(HINT_DELAY_MS - 1);
    expect(hintFor("lobby-start")).not.toBeInTheDocument();

    advance(1);
    expect(hintFor("lobby-start")).toBeInTheDocument();
    expect(isSeen("lobby-start")).toBe(false);

    dismiss();
    expect(hintFor("lobby-start")).not.toBeInTheDocument();
    expect(isSeen("lobby-start")).toBe(true);
  });

  it("shows every eligible hint in priority order, one at a time, 1.5 s apart", () => {
    renderHints(["lobby-start", "lobby-music", "lobby-share-code"]);

    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-share-code")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Dismiss hint" })).toHaveLength(1);

    dismiss();
    advance(HINT_DELAY_MS - 1);
    expect(screen.queryByRole("button", { name: "Dismiss hint" })).not.toBeInTheDocument();
    advance(1);
    expect(hintFor("lobby-music")).toBeInTheDocument();

    dismiss();
    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-start")).toBeInTheDocument();
  });

  it("stays until acknowledged, and using its control acknowledges it", () => {
    renderHints(["lobby-start"]);
    advance(HINT_DELAY_MS);

    advance(60_000);
    expect(hintFor("lobby-start")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "lobby-start" }));
    expect(hintFor("lobby-start")).not.toBeInTheDocument();
    expect(isSeen("lobby-start")).toBe(true);
  });

  it("brings back a hint whose moment passed before it was acknowledged", () => {
    const first = renderHints(["lobby-start"]);
    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-start")).toBeInTheDocument();
    first.unmount();

    renderHints(["lobby-start"]);
    advance(HINT_DELAY_MS);

    expect(hintFor("lobby-start")).toBeInTheDocument();
  });

  it("never shows an acknowledged hint again, until Show hints again restarts the tutorial", () => {
    markHintSeen("lobby-start");
    renderHints(["lobby-start"]);
    advance(HINT_DELAY_MS * 2);
    expect(hintFor("lobby-start")).not.toBeInTheDocument();

    act(() => showHintsAgain());
    advance(HINT_DELAY_MS);

    expect(hintFor("lobby-start")).toBeInTheDocument();
  });

  it("hides at once when hints are switched off and resumes when switched back on", () => {
    renderHints(["lobby-start"]);
    advance(HINT_DELAY_MS);

    act(() => setHintsEnabled(false));
    expect(hintFor("lobby-start")).not.toBeInTheDocument();
    advance(HINT_DELAY_MS * 2);
    expect(hintFor("lobby-start")).not.toBeInTheDocument();

    act(() => setHintsEnabled(true));
    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-start")).toBeInTheDocument();
    expect(isSeen("lobby-start")).toBe(false);
  });

  it("waits while paused, as during a drag", () => {
    renderHints(["lobby-start"]);
    let resume = () => {};
    act(() => {
      resume = pauseHints();
    });

    advance(HINT_DELAY_MS * 2);
    expect(hintFor("lobby-start")).not.toBeInTheDocument();

    act(() => resume());
    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-start")).toBeInTheDocument();
  });

  it("waits until its control is on screen", () => {
    renderHints(["lobby-start"], { isOnScreen: false });
    advance(HINT_DELAY_MS * 2);
    expect(hintFor("lobby-start")).not.toBeInTheDocument();

    act(() => triggerIntersection(true));
    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-start")).toBeInTheDocument();
  });

  it("waits while an overlay lies over its control", () => {
    renderHints(["lobby-start"]);
    const panel = document.createElement("div");
    let close = () => {};
    act(() => {
      close = registerOverlay({
        dismiss: vi.fn(),
        dismissible: true,
        getPanel: () => panel,
        id: "TEST_SHEET",
        kind: "sheet",
      });
    });

    advance(HINT_DELAY_MS * 2);
    expect(hintFor("lobby-start")).not.toBeInTheDocument();

    act(() => close());
    advance(HINT_DELAY_MS);
    expect(hintFor("lobby-start")).toBeInTheDocument();
  });

  it("stays hidden while not eligible", () => {
    renderWithProviders(<Hint id="lobby-start" isEligible={false} />);
    act(() => triggerIntersection(true));
    advance(HINT_DELAY_MS * 2);

    expect(screen.queryByRole("button", { name: "Dismiss hint" })).not.toBeInTheDocument();
    expect(isSeen("lobby-start")).toBe(false);
  });
});
