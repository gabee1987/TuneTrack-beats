import type { PublicPlayerState } from "./player.js";
import type { PublicRoomSettings } from "./roomSettings.js";
import type { TimelineCardPublic } from "./timeline.js";
import type { TrackCardPublic } from "./track.js";

export type RoomId = string;

export type GamePhase = "lobby" | "turn" | "challenge" | "reveal" | "finished";
export type RoomStatus = GamePhase;

export interface PublicTurnState {
  activePlayerId: string;
  turnNumber: number;
  hasUsedSkipTrackWithTt: boolean;
}

export interface PublicRevealState {
  playerId: string;
  placedCard: TimelineCardPublic;
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

export type ChallengePhase = "open" | "claimed";

export interface PublicChallengeState {
  phase: ChallengePhase;
  originalPlayerId: string;
  originalSelectedSlotIndex: number;
  challengerPlayerId: string | null;
  challengeDeadlineEpochMs: number | null;
  challengerSelectedSlotIndex: number | null;
}

export interface PublicRoomState {
  roomId: RoomId;
  status: RoomStatus;
  hostId: string;
  players: PublicPlayerState[];
  timelines: Record<string, TimelineCardPublic[]>;
  currentTrackCard: TrackCardPublic | null;
  targetTimelineCardCount: number;
  settings: PublicRoomSettings;
  turn: PublicTurnState | null;
  challengeState: PublicChallengeState | null;
  revealState: PublicRevealState | null;
  winnerPlayerId: string | null;
}
