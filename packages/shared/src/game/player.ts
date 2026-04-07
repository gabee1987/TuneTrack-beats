export type PlayerId = string;

export interface PublicPlayerState {
  id: PlayerId;
  displayName: string;
  isHost: boolean;
  ttTokenCount: number;
  startingTimelineCardCount: number;
}
