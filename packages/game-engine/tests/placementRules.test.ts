import { describe, expect, it } from "vitest";
import { collectValidSlotIndexes, evaluateTimelinePlacement } from "../src/index.js";

const timelineCards = [
  { id: "track-1", releaseYear: 1980 },
  { id: "track-2", releaseYear: 1990 },
  { id: "track-3", releaseYear: 2000 },
];

describe("evaluateTimelinePlacement", () => {
  it("accepts placement before the first card", () => {
    const result = evaluateTimelinePlacement(timelineCards, 1975, 0);

    expect(result).toEqual({
      isCorrect: true,
      validSlotIndexes: [0],
    });
  });

  it("accepts placement after the last card", () => {
    const result = evaluateTimelinePlacement(timelineCards, 2010, 3);

    expect(result).toEqual({
      isCorrect: true,
      validSlotIndexes: [3],
    });
  });

  it("accepts placement between two cards", () => {
    const result = evaluateTimelinePlacement(timelineCards, 1995, 2);

    expect(result).toEqual({
      isCorrect: true,
      validSlotIndexes: [2],
    });
  });

  it("rejects a wrong slot", () => {
    const result = evaluateTimelinePlacement(timelineCards, 1995, 1);

    expect(result).toEqual({
      isCorrect: false,
      validSlotIndexes: [2],
    });
  });

  it("accepts every slot inside a same-year block", () => {
    const sameYearTimelineCards = [
      { id: "track-1", releaseYear: 1980 },
      { id: "track-2", releaseYear: 1990 },
      { id: "track-3", releaseYear: 1990 },
      { id: "track-4", releaseYear: 1990 },
      { id: "track-5", releaseYear: 2000 },
    ];

    expect(collectValidSlotIndexes(sameYearTimelineCards, 1990)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(evaluateTimelinePlacement(sameYearTimelineCards, 1990, 1).isCorrect).toBe(
      true,
    );
    expect(evaluateTimelinePlacement(sameYearTimelineCards, 1990, 2).isCorrect).toBe(
      true,
    );
    expect(evaluateTimelinePlacement(sameYearTimelineCards, 1990, 3).isCorrect).toBe(
      true,
    );
    expect(evaluateTimelinePlacement(sameYearTimelineCards, 1990, 4).isCorrect).toBe(
      true,
    );
  });
});
