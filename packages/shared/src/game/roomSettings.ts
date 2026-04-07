export type RevealConfirmMode = "host_only" | "host_or_active_player";

export interface PublicRoomSettings {
  targetTimelineCardCount: number;
  defaultStartingTimelineCardCount: number;
  revealConfirmMode: RevealConfirmMode;
  ttModeEnabled: boolean;
  challengeWindowDurationSeconds: number | null;
}
