export type PlayerId = string;

export type PlayerConnectionStatus = "connected" | "disconnected";

export interface PublicPlayerState {
  id: PlayerId;
  displayName: string;
  isHost: boolean;
  connectionStatus: PlayerConnectionStatus;
  disconnectedAtEpochMs: number | null;
  reconnectExpiresAtEpochMs: number | null;
  ttTokenCount: number;
  startingTimelineCardCount: number;
}
