import type { ChallengeState } from "./ChallengeState.js";
import type { GamePlayer } from "./GamePlayer.js";
import type { GameTrackCard } from "./GameTrackCard.js";
import type { RevealState } from "./RevealState.js";
import type { TimelineCard } from "./TimelineCard.js";
import type { TurnState } from "./TurnState.js";

export type GamePhase = "turn" | "challenge" | "reveal" | "finished";

export interface GameState {
  phase: GamePhase;
  players: GamePlayer[];
  timelines: Record<string, TimelineCard[]>;
  deck: GameTrackCard[];
  currentTrackCard: GameTrackCard | null;
  turn: TurnState | null;
  challengeState: ChallengeState | null;
  revealState: RevealState | null;
  winnerPlayerId: string | null;
  targetTimelineCardCount: number;
}
