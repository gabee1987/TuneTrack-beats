import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { placementConfettiParticles, placementFailureShards } from "../../../features/motion";
import { TimelineCelebration } from "./TimelineCelebration";

function countEffects(container: HTMLElement): number {
  return container.querySelector("[aria-hidden='true']")?.children.length ?? 0;
}

describe("TimelineCelebration", () => {
  it("announces the whole message and draws a check with confetti on success", () => {
    const { container } = render(<TimelineCelebration message="Correct placement!" />);

    expect(screen.getByRole("status")).toHaveTextContent("Correct placement!");
    expect(container.querySelectorAll("svg path")).toHaveLength(1);
    // Glow, two rings and every confetti piece.
    expect(countEffects(container)).toBe(3 + placementConfettiParticles.length);
  });

  it("draws a cross with falling shards on failure", () => {
    const { container } = render(<TimelineCelebration message="Wrong year" tone="failure" />);

    expect(screen.getByRole("status")).toHaveTextContent("Wrong year");
    expect(container.querySelectorAll("svg path")).toHaveLength(2);
    expect(countEffects(container)).toBe(3 + placementFailureShards.length);
  });
});
