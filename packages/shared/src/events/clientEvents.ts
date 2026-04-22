import type { RevealConfirmMode } from "../game/roomSettings.js";
import type { RoomId } from "../game/roomState.js";
import type { PlayerId } from "../game/player.js";

export const ClientToServerEvent = {
  AwardTt: "award_tt",
  BuyTimelineCardWithTt: "buy_timeline_card_with_tt",
  ClaimChallenge: "claim_challenge",
  CloseRoom: "close_room",
  ConfirmReveal: "confirm_reveal",
  JoinRoom: "join_room",
  PlaceCard: "place_card",
  PlaceChallenge: "place_challenge",
  ResolveChallengeWindow: "resolve_challenge_window",
  SkipTrackWithTt: "skip_track_with_tt",
  StartGame: "start_game",
  UpdatePlayerProfile: "update_player_profile",
  UpdatePlayerSettings: "update_player_settings",
  UpdateRoomSettings: "update_room_settings",
} as const;

export type ClientToServerEventName =
  (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent];

export interface JoinRoomPayload {
  roomId: RoomId;
  displayName: string;
  sessionId: string;
}

export interface UpdateRoomSettingsPayload {
  roomId: RoomId;
  targetTimelineCardCount: number;
  defaultStartingTimelineCardCount: number;
  startingTtTokenCount: number;
  revealConfirmMode: RevealConfirmMode;
  ttModeEnabled: boolean;
  challengeWindowDurationSeconds: number | null;
}

export interface UpdatePlayerSettingsPayload {
  roomId: RoomId;
  playerId: PlayerId;
  startingTimelineCardCount: number;
  startingTtTokenCount: number;
}

export interface UpdatePlayerProfilePayload {
  roomId: RoomId;
  displayName: string;
}

export interface AwardTtPayload {
  roomId: RoomId;
  playerId: PlayerId;
  amount: number;
}

export interface StartGamePayload {
  roomId: RoomId;
}

export interface PlaceCardPayload {
  roomId: RoomId;
  selectedSlotIndex: number;
}

export interface ConfirmRevealPayload {
  roomId: RoomId;
}

export interface CloseRoomPayload {
  roomId: RoomId;
}

export interface ClaimChallengePayload {
  roomId: RoomId;
}

export interface PlaceChallengePayload {
  roomId: RoomId;
  selectedSlotIndex: number;
}

export interface ResolveChallengeWindowPayload {
  roomId: RoomId;
}

export interface SkipTrackWithTtPayload {
  roomId: RoomId;
}

export interface BuyTimelineCardWithTtPayload {
  roomId: RoomId;
}
