import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { FirstRunHint } from "./FirstRunHint";
import { readHintState, setHintsEnabled } from "./hintState";

const HINT_TITLE = "Choose your player name";
const HINT_DELAY_MS = 1_500;
const HINT_AUTO_DISMISS_MS = 12_000;

function createAnchor() {
  const anchor = document.createElement("button");
  document.body.append(anchor);
  return anchor;
}

function renderHint({
  anchor = createAnchor(),
  isEligible = true,
}: { anchor?: HTMLElement | null; isEligible?: boolean } = {}) {
  return renderWithProviders(
    <FirstRunHint anchor={anchor} id="profile-name" isEligible={isEligible} />,
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("FirstRunHint and its anchor hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits before it appears, then counts the hint as seen", () => {
    renderHint();

    advance(HINT_DELAY_MS - 1);
    expect(screen.queryByRole("dialog", { name: HINT_TITLE })).not.toBeInTheDocument();

    advance(1);
    expect(screen.getByRole("dialog", { name: HINT_TITLE })).toBeInTheDocument();
    expect(readHintState().seenCounts["profile-name"]).toBe(1);
  });

  it("never appears again once seen", () => {
    const first = renderHint();
    advance(HINT_DELAY_MS);
    first.unmount();

    renderHint();
    advance(HINT_DELAY_MS * 2);

    expect(screen.queryByRole("dialog", { name: HINT_TITLE })).not.toBeInTheDocument();
  });

  it("goes away on its own after a while", () => {
    renderHint();
    advance(HINT_DELAY_MS);

    advance(HINT_AUTO_DISMISS_MS);

    expect(screen.queryByRole("dialog", { name: HINT_TITLE })).not.toBeInTheDocument();
  });

  it("goes away when dismissed", () => {
    renderHint();
    advance(HINT_DELAY_MS);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));

    expect(screen.queryByRole("dialog", { name: HINT_TITLE })).not.toBeInTheDocument();
  });

  it.each([
    ["without an anchor", { anchor: null }],
    ["while not eligible", { isEligible: false }],
  ])("stays hidden %s", (_, options) => {
    renderHint(options);
    advance(HINT_DELAY_MS * 2);

    expect(screen.queryByRole("dialog", { name: HINT_TITLE })).not.toBeInTheDocument();
    expect(readHintState().seenCounts["profile-name"]).toBeUndefined();
  });

  it("stays hidden while hints are switched off", () => {
    setHintsEnabled(false);
    renderHint();
    advance(HINT_DELAY_MS * 2);

    expect(screen.queryByRole("dialog", { name: HINT_TITLE })).not.toBeInTheDocument();
  });
});
