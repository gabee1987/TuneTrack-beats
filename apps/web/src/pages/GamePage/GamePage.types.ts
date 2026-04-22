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
  celebrationCard: GamePageCard | null;
  celebrationKey: string | null;
  celebrationMessage: string | null;
  celebrationTone?: TimelineCelebrationTone;
  hiddenCardMode: HiddenCardMode;
  hint: string;
  isPreviewCardReplacing: boolean;
  previewCardSwapKey: number;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  shouldAnimateCelebrationCardToMine: boolean;
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
  isPreviewCardReplacing: boolean;
  originalChosenSlotIndex: number | null;
  previewCardSwapKey: number;
  selectable: boolean;
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
    | "canUseBuyCard"
    | "canUseSkipTrack"
    | "challengeActionBody"
    | "challengeActionTitle"
    | "challengeCountdownLabel"
    | "currentPlayerTtCount"
    | "getPlayerName"
    | "handleBuyTimelineCardWithTt"
    | "handleClaimChallenge"
    | "handleConfirmReveal"
    | "handlePlaceCard"
    | "handlePlaceChallenge"
    | "handleResolveChallengeWindow"
    | "handleSkipTrackWithTt"
    | "skipTrackSpendAnimationKey"
    | "showHelperLabels"
  > {
  roomState: PublicRoomState;
}

export interface GamePageAssemblyModel {
  actions: GamePageActionPanelsModel;
  errorMessage: string | null;
  header: GamePageHeaderModel;
  timeline: TimelinePanelModel;
}

export type GamePageController = GamePageActionHandlers & {
  canChangeTimelineView: boolean;
  canConfirmBeatPlacement: boolean;
  canConfirmReveal: boolean;
  canConfirmTurnPlacement: boolean;
  canSelectSlot: boolean;
  canToggleTimelineView: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  challengeSuccessCelebrationCard: GamePageCard | null;
  challengeSuccessCelebrationKey: string | null;
  challengeSuccessMessage: string | null;
  challengeSuccessTone: TimelineCelebrationTone;
  shouldAnimateCelebrationCardToMine: boolean;
  disabledTimelineSlots: number[];
  errorMessage: string | null;
  hiddenCardMode: HiddenCardMode;
  isHost: boolean;
  isViewingOwnTimeline: boolean;
  leadingPlayers: PublicRoomState["players"];
  menuTabs: AppShellMenuTab[];
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  setSelectedSlotIndex: (slotIndex: number) => void;
  setTimelineView: (view: TimelineView) => void;
  isPreviewCardReplacing: boolean;
  skipTrackSpendAnimationKey: number;
  previewCardSwapKey: number;
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
