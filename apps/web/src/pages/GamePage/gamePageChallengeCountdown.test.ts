import { describe, expect, it } from "vitest";
import { formatChallengeCountdownLabel } from "./gamePageChallengeCountdown";

const t = (key: string, params?: Record<string, string | number>) =>
  key === "game.status.countdownBeat" ? `${params?.seconds}s left to call Beat!` : key;

describe("formatChallengeCountdownLabel", () => {
  it("returns null when there is no deadline", () => {
    expect(formatChallengeCountdownLabel(null, 1_000, t)).toBeNull();
  });

  it("ceils the remaining seconds", () => {
    expect(formatChallengeCountdownLabel(10_000, 7_100, t)).toBe("3s left to call Beat!");
  });

  it("clamps at zero once the deadline has passed", () => {
    expect(formatChallengeCountdownLabel(10_000, 15_000, t)).toBe("0s left to call Beat!");
  });

  it("returns zero seconds exactly at the deadline", () => {
    expect(formatChallengeCountdownLabel(10_000, 10_000, t)).toBe("0s left to call Beat!");
  });
});
