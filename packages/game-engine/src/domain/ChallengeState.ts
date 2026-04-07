import type { TimelineCard } from "./TimelineCard.js";

export type ChallengePhase = "open" | "claimed";

export interface ChallengeState {
  phase: ChallengePhase;
  originalPlayerId: string;
  originalSelectedSlotIndex: number;
  placedCard: TimelineCard;
  originalWasCorrect: boolean;
  originalValidSlotIndexes: number[];
  challengerPlayerId: string | null;
  challengerSelectedSlotIndex: number | null;
  challengeDeadlineEpochMs: number | null;
}
