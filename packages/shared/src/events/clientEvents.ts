import type { RevealConfirmMode } from "../game/roomSettings.js";
import type { RoomId } from "../game/roomState.js";
import type { PlayerId } from "../game/player.js";

export const ClientToServerEvent = {
  AwardTt: "award_tt",
  BuyTimelineCardWithTt: "buy_timeline_card_with_tt",
  ClaimChallenge: "claim_challenge",
  CloseRoom: "close_room",
  ConfirmReveal: "confirm_reveal",
  GetPlaylistTracks: "get_playlist_tracks",
  ImportPlaylist: "import_playlist",
  JoinRoom: "join_room",
  PlaceCard: "place_card",
  PlaceChallenge: "place_challenge",
  RefreshSpotifyToken: "refresh_spotify_token",
  RemovePlaylistTracks: "remove_playlist_tracks",
  RequestSpotifyAuthUrl: "request_spotify_auth_url",
  ResolveChallengeWindow: "resolve_challenge_window",
  SkipTrackWithTt: "skip_track_with_tt",
  SkipTurn: "skip_turn",
  StartGame: "start_game",
  TransferHost: "transfer_host",
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

export interface TransferHostPayload {
  roomId: RoomId;
  playerId: PlayerId;
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

export interface ImportPlaylistPayload {
  roomId: RoomId;
  playlistUrl: string;
}

export interface RequestSpotifyAuthUrlPayload {
  roomId: RoomId;
}

export interface RefreshSpotifyTokenPayload {
  roomId: RoomId;
}

export interface GetPlaylistTracksPayload {
  roomId: RoomId;
}

export interface RemovePlaylistTracksPayload {
  roomId: RoomId;
  trackIds: string[];
}
