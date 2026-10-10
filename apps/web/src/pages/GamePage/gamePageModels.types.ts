import type { PublicRoomState, TimelineCardPublic } from "@tunetrack/shared/client";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import type {
  HiddenCardMode,
  RevealedCardMode,
  ThemeId,
} from "../../features/preferences/uiPreferences";
import type { ClosedRoomReason } from "../../features/ui/RoomResetModal";
import type {
  GamePageCard,
  GamePageChallengePhase,
  GamePageLeader,
  GamePagePlayerNameResolver,
  GamePageViewPreferenceUpdater,
  TimelineView,
} from "./GamePage.types";
import type {
  BuyTimelineCardActionStatus,
  ClaimChallengeActionStatus,
  CloseRoomActionStatus,
  ConfirmRevealActionStatus,
  GamePageActionHandlers,
  PlaceCardActionStatus,
  PlaceChallengeActionStatus,
  ResolveChallengeWindowActionStatus,
  SkipTrackActionStatus,
  SkipTurnActionStatus,
} from "./gamePageActionTypes";
import type {
  PreviewCardTransitionEvent,
  TimelineCelebrationTransitionEvent,
  TimelinePreviewTransitionEvent,
} from "./gamePageTransitionEvents";
import type { ChallengeMarkerTone, TimelinePanelModel } from "./timelinePanel.types";

export interface GamePageHeaderModel extends Pick<
  GamePageController,
  | "currentPlayerId"
  | "closeRoomActionStatus"
  | "handleCloseRoom"
  | "handleSkipTurn"
  | "isCloseRoomPending"
  | "isSkipTurnPending"
  | "leadingPlayers"
  | "menuTabs"
  | "showMiniStandings"
  | "showPhaseChip"
  | "showRoomCodeChip"
  | "showTimelineHints"
  | "showTurnNumberChip"
  | "statusBadgeText"
  | "statusDetailText"
  | "skipTurnActionStatus"
  | "updateViewPreferences"
  | "visibleTimelineCardCount"
  | "visibleTimelinePlayerId"
  | "visibleTimelineTtCount"
  | "visibleTimelineTitle"
> {
  hostId: string;
  roomId: string;
  status: PublicRoomState["status"];
  ttModeEnabled: boolean;
  turnNumber: number | null;
}

export interface GamePageActionPanelsModel extends Pick<
  GamePageController & GamePageControllerExtras,
  | "canClaimChallenge"
  | "canConfirmBeatPlacement"
  | "canConfirmReveal"
  | "canConfirmTurnPlacement"
  | "canResolveChallengeWindow"
  | "canSkipOfflinePlayer"
  | "canUseBuyCard"
  | "canUseSkipTrack"
  | "buyTimelineCardActionStatus"
  | "skipTrackActionStatus"
  | "challengeActionBody"
  | "challengeActionTitle"
  | "claimChallengeActionStatus"
  | "confirmRevealActionStatus"
  | "currentPlayerId"
  | "currentPlayerTtCount"
  | "handleBuyTimelineCardWithTt"
  | "handleClaimChallenge"
  | "handleConfirmReveal"
  | "handlePlaceCard"
  | "handlePlaceChallenge"
  | "handleResolveChallengeWindow"
  | "handleSkipTrackWithTt"
  | "handleSkipTurn"
  | "isBuyTimelineCardPending"
  | "isSkipTrackPending"
  | "isSkipTurnPending"
  | "isCurrentPlayerTurn"
  | "isClaimChallengePending"
  | "isConfirmRevealPending"
  | "isPlaceCardPending"
  | "isPlaceChallengePending"
  | "isResolveChallengeWindowPending"
  | "placeCardActionStatus"
  | "placeChallengeActionStatus"
  | "resolveChallengeWindowActionStatus"
  | "skipTurnActionStatus"
  | "showHelperLabels"
> {
  challengeDeadlineEpochMs: number | null;
  challengePhase: GamePageChallengePhase | null;
  skipCandidateName: string | null;
  status: PublicRoomState["status"];
  ttModeEnabled: boolean;
  turnSkipDeadlineEpochMs: number | null;
  winnerPlayerId: string | null;
  winnerPlayerName: string;
}

export interface GamePageAssemblyModel {
  actions: GamePageActionPanelsModel;
  header: GamePageHeaderModel;
  timeline: TimelinePanelModel;
}

export type GamePageController = GamePageActionHandlers & {
  canChangeTimelineView: boolean;
  closedRoomReason: ClosedRoomReason;
  errorKey: number;
  handleClosedRoomReset: () => void;
  hasClosedRoomReset: boolean;
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
  challengeMarkerTone: ChallengeMarkerTone;
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  disabledTimelineSlots: number[];
  errorMessage: string | null;
  hiddenCardMode: HiddenCardMode;
  revealedCardMode: RevealedCardMode;
  isHost: boolean;
  isBuyTimelineCardPending: boolean;
  isCloseRoomPending: boolean;
  isCurrentPlayerTurn: boolean;
  isClaimChallengePending: boolean;
  isConfirmRevealPending: boolean;
  isPlaceCardPending: boolean;
  isPlaceChallengePending: boolean;
  isResolveChallengeWindowPending: boolean;
  isSkipTrackPending: boolean;
  isSkipTurnPending: boolean;
  confirmRevealActionStatus: ConfirmRevealActionStatus;
  claimChallengeActionStatus: ClaimChallengeActionStatus;
  closeRoomActionStatus: CloseRoomActionStatus;
  buyTimelineCardActionStatus: BuyTimelineCardActionStatus;
  skipTrackActionStatus: SkipTrackActionStatus;
  skipTurnActionStatus: SkipTurnActionStatus;
  placeCardActionStatus: PlaceCardActionStatus;
  placeChallengeActionStatus: PlaceChallengeActionStatus;
  resolveChallengeWindowActionStatus: ResolveChallengeWindowActionStatus;
  isViewingOwnTimeline: boolean;
  leadingPlayers: GamePageLeader[];
  menuTabs: AppShellMenuTab[];
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  setSelectedSlotIndex: (slotIndex: number) => void;
  setTimelineView: (view: TimelineView) => void;
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

export type UseGamePageControllerResult = GamePageController & GamePageControllerExtras;

export type LoadedGamePageController = Omit<UseGamePageControllerResult, "roomState"> & {
  roomState: PublicRoomState;
};

export interface GamePageAssemblyProps {
  model: GamePageAssemblyModel;
}
