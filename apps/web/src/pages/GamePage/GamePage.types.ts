import type {
  PublicRoomState,
  TimelineCardPublic,
  TrackCardPublic,
} from "@tunetrack/shared/client";
import type { ViewPreferences } from "../../features/preferences/uiPreferences";

export type TimelineView = "active" | "mine";

export type GamePageCard = TrackCardPublic | TimelineCardPublic;
export type GamePageChallengePhase = NonNullable<PublicRoomState["challengeState"]>["phase"];

export interface GamePageLeader {
  cardCount: number;
  displayName: string;
  id: string;
  ttTokenCount: number;
}
export type GamePagePlayerNameResolver = (playerId: string | null | undefined) => string;
export type GamePageViewPreferenceUpdate = Partial<ViewPreferences>;
export type GamePageViewPreferenceUpdater = (nextView: GamePageViewPreferenceUpdate) => void;

export interface GameRouteState {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export type * from "./gamePageActionTypes";
export type * from "./gamePageModels.types";
export type * from "./timelinePanel.types";
