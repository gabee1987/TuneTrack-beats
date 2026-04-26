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
}
