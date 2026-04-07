import type { TimelineCard } from "./TimelineCard.js";

export interface RevealState {
  playerId: string;
  placedCard: TimelineCard;
  selectedSlotIndex: number;
  wasCorrect: boolean;
  revealType: "placement" | "tt_buy";
  validSlotIndexes: number[];
  challengerPlayerId: string | null;
  challengerSelectedSlotIndex: number | null;
  challengeWasSuccessful: boolean | null;
  challengerTtChange: number;
  awardedPlayerId: string | null;
  awardedSlotIndex: number | null;
}
