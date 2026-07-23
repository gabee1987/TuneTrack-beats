import type { GameTrackCard } from "../domain/GameTrackCard.js";

export interface StartGamePlayerInput {
  id: string;
  displayName: string;
  startingTimelineCardCount: number;
  startingTtTokenCount: number;
}

export interface StartGameInput {
  players: StartGamePlayerInput[];
  deck: GameTrackCard[];
  targetTimelineCardCount: number;
}

export interface PlaceCardOptions {
  challengeEnabled?: boolean;
  challengeDeadlineEpochMs?: number | null;
}
