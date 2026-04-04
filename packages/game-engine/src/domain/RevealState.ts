import type { TimelineCard } from "./TimelineCard.js";

export interface RevealState {
  playerId: string;
  placedCard: TimelineCard;
  selectedSlotIndex: number;
  wasCorrect: boolean;
  validSlotIndexes: number[];
}
