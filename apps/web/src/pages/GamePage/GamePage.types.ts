import type {
  PublicRoomState,
  TimelineCardPublic,
  TrackCardPublic,
} from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import type {
  HiddenCardMode,
  ViewPreferences,
  ThemeId,
} from "../../features/preferences/uiPreferences";
import type {
  PreviewCardTransitionEvent,
  TimelinePreviewTransitionEvent,
  TimelineCelebrationTransitionEvent,
} from "./gamePageTransitionEvents";

export type TimelineView = "active" | "mine";

export type ChallengeMarkerTone = "pending" | "success" | "failure";
export type TimelineCelebrationTone = "success" | "failure";

export type GamePageCard = TrackCardPublic | TimelineCardPublic;
export type GamePagePlayerNameResolver = (
  playerId: string | null | undefined,
) => string;
export type GamePageViewPreferenceUpdate = Partial<ViewPreferences>;
export type GamePageViewPreferenceUpdater = (
  nextView: GamePageViewPreferenceUpdate,
) => void;

export interface GamePageActionHandlers {
  handleBuyTimelineCardWithTt: () => void;
  handleClaimChallenge: () => void;
  handleCloseRoom: () => void;
  handleConfirmReveal: () => void;
  handlePlaceCard: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  handleSkipTrackWithTt: () => void;
  handleSkipTurn: () => void;
}

export interface GameRouteState {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export interface TimelinePanelHeaderModel {
  canChangeTimelineView?: boolean;
  canToggleView?: boolean;
  cardCount: number;
  onToggleTimelineView?: (view: TimelineView) => void;
  timelineView?: TimelineView;
  title: string;
}

export interface TimelinePanelInteractionModel {
  challengeMarkerTone?: ChallengeMarkerTone;
  challengerChosenSlotIndex: number | null;
  disabledSlotIndexes?: number[];
  onSelectSlot: (slotIndex: number) => void;
  originalChosenSlotIndex: number | null;
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  selectable: boolean;
  selectedSlotIndex: number;
}

export interface TimelinePanelRenderModel {
  hiddenCardMode: HiddenCardMode;
  hint: string;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  timelinePreviewTransitionEvent: TimelinePreviewTransitionEvent | null;
  timelineCelebrationTransitionEvent: TimelineCelebrationTransitionEvent | null;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  showHint: boolean;
  theme: ThemeId;
  timelineCards: TimelineCardPublic[];
  timelineView?: TimelineView;
}

export interface TimelinePanelModel {
  header: TimelinePanelHeaderModel;
  interaction: TimelinePanelInteractionModel;
  render: TimelinePanelRenderModel;
}

export interface TimelinePanelItemsModel {
  challengeMarkerTone: ChallengeMarkerTone;
  challengerChosenSlotIndex: number | null;
  disabledSlotIndexes: number[];
  hiddenCardMode: HiddenCardMode;
  originalChosenSlotIndex: number | null;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  selectable: boolean;
  shouldAnimateCorrectPlacement?: boolean;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  theme: ThemeId;
}

export interface TimelinePanelDragModel {
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  timelineCards: TimelineCardPublic[];
}

export interface GamePageHeaderModel
  extends Pick<
    GamePageController,
    | "currentPlayerId"
    | "handleCloseRoom"
    | "leadingPlayers"
    | "menuTabs"
    | "showMiniStandings"
    | "showPhaseChip"
    | "showRoomCodeChip"
    | "showTimelineHints"
    | "showTurnNumberChip"
    | "statusBadgeText"
    | "statusDetailText"
    | "updateViewPreferences"
    | "visibleTimelineCardCount"
    | "visibleTimelinePlayerId"
    | "visibleTimelineTtCount"
    | "visibleTimelineTitle"
  > {
  roomState: PublicRoomState;
}

export interface GamePageActionPanelsModel
  extends Pick<
    GamePageController & GamePageControllerExtras,
    | "canClaimChallenge"
    | "canConfirmBeatPlacement"
    | "canConfirmReveal"
    | "canConfirmTurnPlacement"
    | "canResolveChallengeWindow"
    | "canSkipOfflinePlayer"
    | "canUseBuyCard"
    | "canUseSkipTrack"
    | "challengeActionBody"
    | "challengeActionTitle"
    | "challengeCountdownLabel"
    | "currentPlayerId"
    | "currentPlayerTtCount"
    | "getPlayerName"
    | "handleBuyTimelineCardWithTt"
    | "handleClaimChallenge"
    | "handleConfirmReveal"
    | "handlePlaceCard"
    | "handlePlaceChallenge"
    | "handleResolveChallengeWindow"
    | "handleSkipTrackWithTt"
    | "handleSkipTurn"
    | "isCurrentPlayerTurn"
    | "buyTimelineCardSpendAnimationKey"
    | "skipTrackSpendAnimationKey"
    | "showHelperLabels"
  > {
  roomState: PublicRoomState;
}

export interface GamePageAssemblyModel {
  actions: GamePageActionPanelsModel;
  header: GamePageHeaderModel;
  timeline: TimelinePanelModel;
}

export type GamePageController = GamePageActionHandlers & {
  canChangeTimelineView: boolean;
  errorKey: number;
  canConfirmBeatPlacement: boolean;
  canConfirmReveal: boolean;
  canConfirmTurnPlacement: boolean;
  canSelectSlot: boolean;
  canSkipOfflinePlayer: boolean;
  canToggleTimelineView: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  disabledTimelineSlots: number[];
  errorMessage: string | null;
  hiddenCardMode: HiddenCardMode;
  isHost: boolean;
  isCurrentPlayerTurn: boolean;
  isViewingOwnTimeline: boolean;
  leadingPlayers: PublicRoomState["players"];
  menuTabs: AppShellMenuTab[];
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  setSelectedSlotIndex: (slotIndex: number) => void;
  setTimelineView: (view: TimelineView) => void;
  buyTimelineCardSpendAnimationKey: number;
  skipTrackSpendAnimationKey: number;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  timelinePreviewTransitionEvent: TimelinePreviewTransitionEvent | null;
  timelineCelebrationTransitionEvent: TimelineCelebrationTransitionEvent | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  showHelperLabels: boolean;
  showMiniStandings: boolean;
  showPhaseChip: boolean;
  showRoomCodeChip: boolean;
  showTimelineHints: boolean;
  showTurnNumberChip: boolean;
  statusBadgeText: string;
  statusDetailText: string;
  theme: ThemeId;
  timelineView: TimelineView;
  updateViewPreferences: GamePageViewPreferenceUpdater;
  visibleChallengeChosenSlot: number | null;
  visibleOriginalChosenSlot: number | null;
  visiblePreviewCard: GamePageCard | null;
  visiblePreviewSlot: number | null;
  visibleTimelineCardCount: number;
  visibleTimelineCards: TimelineCardPublic[];
  visibleTimelineHint: string;
  visibleTimelinePlayerId: string | null;
  visibleTimelineTtCount: number;
  visibleTimelineTitle: string;
};

export interface GamePageControllerExtras {
  canClaimChallenge: boolean;
  canResolveChallengeWindow: boolean;
  getPlayerName: GamePagePlayerNameResolver;
}

export type UseGamePageControllerResult = GamePageController &
  GamePageControllerExtras;

export type LoadedGamePageController = Omit<
  UseGamePageControllerResult,
  "roomState"
> & {
  roomState: PublicRoomState;
};

export interface GamePageAssemblyProps {
  model: GamePageAssemblyModel;
}
