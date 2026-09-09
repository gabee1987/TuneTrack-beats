import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import {
  TEST_GUEST_ID,
  TEST_HOST_ID,
  buildPlayer,
  buildTurnRoomState,
} from "../../../test/roomStateFixtures";
import { HeaderLeadersStrip } from "./HeaderLeadersStrip";

const leaders = [
  buildPlayer({ id: TEST_HOST_ID, displayName: "Player One" }),
  buildPlayer({ id: TEST_GUEST_ID, displayName: "Player Two", isHost: false }),
];

function renderStrip(show: boolean, ttModeEnabled = false) {
  const roomState = buildTurnRoomState();

  return renderWithProviders(
    <HeaderLeadersStrip
      getCardCountLabel={(count) => `${count} cards`}
      leadingPlayers={leaders}
      roomState={{
        ...roomState,
        settings: { ...roomState.settings, ttModeEnabled },
      }}
      show={show}
    />,
  );
}

describe("HeaderLeadersStrip", () => {
  it("lists each leader with a rank and card count", () => {
    renderStrip(true);

    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("Player Two")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("renders nothing when hidden", () => {
    renderStrip(false);
    expect(screen.queryByText("Player One")).not.toBeInTheDocument();
  });

  it("omits token counts when TT mode is off", () => {
    renderStrip(true, false);
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });

  it("shows token counts when TT mode is on", () => {
    renderStrip(true, true);
    expect(screen.getAllByText("·").length).toBe(leaders.length);
  });
});

/**
 * Defect B1/B6 class: a chip painted with `outline` inside a scrolling strip has its
 * outline clipped, because `overflow-x: auto` makes the strip a scroll container in both
 * axes. There is no runtime observable for this in jsdom, so assert the stylesheet.
 */
describe("leaderboard chip clipping (defect B6)", () => {
  const stylesheet = readFileSync(
    join(process.cwd(), "src/pages/GamePage/gamePageChrome.module.css"),
    "utf8",
  );

  function ruleFor(selector: string): string {
    const start = stylesheet.indexOf(`${selector} {`);
    expect(start, `${selector} should exist`).toBeGreaterThan(-1);
    return stylesheet.slice(start, stylesheet.indexOf("}", start));
  }

  it("draws the leader chip border inside its box", () => {
    const rule = ruleFor(".headerLeaderChip");

    expect(rule).toMatch(/\bborder:\s*1px solid/);
    expect(rule, "an outline would be clipped by the scrolling strip").not.toMatch(
      /\boutline:\s*1px solid/,
    );
  });

  it("gives the scrolling strip block padding so nothing is cropped", () => {
    expect(ruleFor(".headerLeadersStrip")).toMatch(/padding-block:/);
  });
});
