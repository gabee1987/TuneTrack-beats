import type { TimelineCard } from "../domain/TimelineCard.js";

export interface PlacementEvaluationResult {
  isCorrect: boolean;
  validSlotIndexes: number[];
}

export function evaluateTimelinePlacement(
  timelineCards: TimelineCard[],
  candidateReleaseYear: number,
  selectedSlotIndex: number,
): PlacementEvaluationResult {
  const validSlotIndexes = collectValidSlotIndexes(timelineCards, candidateReleaseYear);

  return {
    isCorrect: validSlotIndexes.includes(selectedSlotIndex),
    validSlotIndexes,
  };
}

export function collectValidSlotIndexes(
  timelineCards: TimelineCard[],
  candidateReleaseYear: number,
): number[] {
  if (timelineCards.length === 0) {
    return [0];
  }

  const firstGreaterYearIndex = timelineCards.findIndex(
    (timelineCard) => timelineCard.releaseYear > candidateReleaseYear,
  );
  const insertionUpperBound =
    firstGreaterYearIndex === -1 ? timelineCards.length : firstGreaterYearIndex;

  const firstEqualYearIndex = timelineCards.findIndex(
    (timelineCard) => timelineCard.releaseYear === candidateReleaseYear,
  );

  if (firstEqualYearIndex === -1) {
    return [insertionUpperBound];
  }

  const lastEqualYearIndex = findLastEqualYearIndex(
    timelineCards,
    candidateReleaseYear,
  );

  return createInclusiveNumberRange(firstEqualYearIndex, lastEqualYearIndex + 1);
}

function createInclusiveNumberRange(startValue: number, endValue: number): number[] {
  return Array.from(
    { length: endValue - startValue + 1 },
    (_, offset) => startValue + offset,
  );
}

function findLastEqualYearIndex(
  timelineCards: TimelineCard[],
  candidateReleaseYear: number,
): number {
  for (let index = timelineCards.length - 1; index >= 0; index -= 1) {
    const timelineCard = timelineCards[index];

    if (timelineCard && timelineCard.releaseYear === candidateReleaseYear) {
      return index;
    }
  }

  return -1;
}
