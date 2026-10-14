import { describe, expect, it } from "vitest";
import {
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
} from "../constants/gameplay.js";
import {
  MAX_RECOMMENDED_DECK_SIZE,
  MIN_RECOMMENDED_DECK_SIZE,
  getRecommendedDeckSize,
  getRequiredDeckSize,
} from "./deckSize.js";

function playersStartingWith(playerCount: number, startingCount = 1): number[] {
  return Array.from({ length: playerCount }, () => startingCount);
}

describe("getRequiredDeckSize", () => {
  it("needs 37 cards for four players racing to 10 from one card (04 §4.1)", () => {
    expect(
      getRequiredDeckSize({
        startingTimelineCardCounts: playersStartingWith(4),
        targetTimelineCardCount: 10,
      }),
    ).toBe(37);
  });

  it("lets every player hold one card short of the target, plus one card, for 1–8 players and targets 3–30", () => {
    for (let playerCount = 1; playerCount <= 8; playerCount += 1) {
      for (
        let target = MIN_TARGET_TIMELINE_CARD_COUNT;
        target <= MAX_TARGET_TIMELINE_CARD_COUNT;
        target += 1
      ) {
        expect(
          getRequiredDeckSize({
            startingTimelineCardCounts: playersStartingWith(playerCount),
            targetTimelineCardCount: target,
          }),
        ).toBe(playerCount * (target - 1) + 1);
      }
    }
  });

  it("counts a host-raised starting hand above target − 1 as held cards", () => {
    expect(
      getRequiredDeckSize({
        startingTimelineCardCounts: [5, 1],
        targetTimelineCardCount: 3,
      }),
    ).toBe(5 + 2 + 1);
  });
});

describe("getRecommendedDeckSize", () => {
  it("adds half again and rounds up to ten: 37 required → 60", () => {
    expect(
      getRecommendedDeckSize({
        startingTimelineCardCounts: playersStartingWith(4),
        targetTimelineCardCount: 10,
      }),
    ).toBe(60);
  });

  it("never recommends fewer than 40 songs", () => {
    expect(
      getRecommendedDeckSize({
        startingTimelineCardCounts: playersStartingWith(1),
        targetTimelineCardCount: MIN_TARGET_TIMELINE_CARD_COUNT,
      }),
    ).toBe(MIN_RECOMMENDED_DECK_SIZE);
  });

  it("never recommends more songs than a quick pick can generate", () => {
    expect(
      getRecommendedDeckSize({
        startingTimelineCardCounts: playersStartingWith(20),
        targetTimelineCardCount: MAX_TARGET_TIMELINE_CARD_COUNT,
      }),
    ).toBe(MAX_RECOMMENDED_DECK_SIZE);
  });
});
