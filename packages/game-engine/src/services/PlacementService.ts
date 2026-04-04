import type { TimelineCard } from "../domain/TimelineCard.js";
import {
  type PlacementEvaluationResult,
  evaluateTimelinePlacement,
} from "../rules/placementRules.js";

export class PlacementService {
  public evaluatePlacement(
    timelineCards: TimelineCard[],
    candidateReleaseYear: number,
    selectedSlotIndex: number,
  ): PlacementEvaluationResult {
    return evaluateTimelinePlacement(
      timelineCards,
      candidateReleaseYear,
      selectedSlotIndex,
    );
  }
}
