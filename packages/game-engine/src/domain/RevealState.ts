import type { TimelineCard } from "./TimelineCard.js";

export interface RevealState {
  playerId: string;
  placedCard: TimelineCard;
  selectedSlotIndex: number;
  wasCorrect: boolean;
  validSlotIndexes: number[];
  challengerPlayerId: string | null;
  challengerSelectedSlotIndex: number | null;
  challengeWasSuccessful: boolean | null;
  challengerTtChange: number;
}
