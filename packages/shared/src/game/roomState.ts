import type { PublicPlayerState } from "./player.js";
import type { TimelineCardPublic } from "./timeline.js";
import type { TrackCardPublic } from "./track.js";

export type RoomId = string;

export type RoomStatus = "lobby" | "in_game" | "finished";

export interface PublicRoomState {
  roomId: RoomId;
  status: RoomStatus;
  hostId: string;
  players: PublicPlayerState[];
  timelines: Record<string, TimelineCardPublic[]>;
  currentTrackCard: TrackCardPublic | null;
  targetTimelineCardCount: number;
}
