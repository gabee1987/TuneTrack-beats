import type { SpotifyAccountType } from "../spotify/spotifyAuth.js";

export type RevealConfirmMode = "host_only" | "host_or_active_player";
export type SpotifyAuthStatus = "none" | "connected";

export interface PublicRoomSettings {
  targetTimelineCardCount: number;
  defaultStartingTimelineCardCount: number;
  startingTtTokenCount: number;
  revealConfirmMode: RevealConfirmMode;
  ttModeEnabled: boolean;
  challengeWindowDurationSeconds: number | null;
  playlistImported: boolean;
  importedTrackCount: number;
  spotifyAuthStatus: SpotifyAuthStatus;
  spotifyAccountType: SpotifyAccountType | null;
  /**
   * Player authorized to run Web Playback for this room.
   * Follows the room host on host transfer / host inheritance.
   */
  spotifyPlaybackOwnerPlayerId: string | null;
  /**
   * Increments on every playback handoff so in-flight plays from a previous
   * host device are rejected as stale.
   */
  spotifyPlaybackGeneration: number;
}
