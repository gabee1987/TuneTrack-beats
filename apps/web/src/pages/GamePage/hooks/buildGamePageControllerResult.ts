import type {
  UseGamePageControllerResult,
  TimelineView,
} from "../GamePage.types";
import type { PublicRoomState } from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../../features/app-shell/AppShellMenu";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";

interface BuildGamePageControllerResultOptions {
  actionState: Pick<
    UseGamePageControllerResult,
    | "handleBuyTimelineCardWithTt"
    | "handleClaimChallenge"
    | "handleCloseRoom"
    | "handleConfirmReveal"
    | "handlePlaceCard"
    | "handlePlaceChallenge"
    | "handleResolveChallengeWindow"
    | "handleSkipTrackWithTt"
    | "buyTimelineCardSpendAnimationKey"
    | "skipTrackSpendAnimationKey"
  >;
  capabilityState: Pick<
    UseGamePageControllerResult,
    | "canChangeTimelineView"
    | "canClaimChallenge"
    | "canConfirmBeatPlacement"
    | "canConfirmReveal"
    | "canConfirmTurnPlacement"
    | "canResolveChallengeWindow"
    | "canSelectSlot"
    | "canToggleTimelineView"
    | "canUseBuyCard"
    | "canUseSkipTrack"
  >;
  displayState: Pick<
    UseGamePageControllerResult,
    | "challengeActionBody"
    | "challengeActionTitle"
    | "challengeCountdownLabel"
    | "challengeMarkerTone"
    | "challengeSuccessCelebrationCard"
    | "challengeSuccessCelebrationKey"
    | "challengeSuccessMessage"
    | "challengeSuccessTone"
    | "shouldAnimateCelebrationCardToMine"
    | "disabledTimelineSlots"
    | "isPreviewCardReplacing"
    | "previewCardSwapKey"
    | "showCorrectPlacementPreview"
    | "showCorrectionPreview"
    | "statusBadgeText"
    | "statusDetailText"
  >;
  errorMessage: string | null;
  playerState: {
    currentPlayerId: string | null;
    currentPlayerTtCount: number;
    getPlayerName: UseGamePageControllerResult["getPlayerName"];
    isHost: boolean;
    isViewingOwnTimeline: boolean;
    leadingPlayers: PublicRoomState["players"];
    menuTabs: AppShellMenuTab[];
    roomState: PublicRoomState | null;
  };
  preferenceState: {
    hiddenCardMode: HiddenCardMode;
    showDevAlbumInfo: boolean;
    showDevCardInfo: boolean;
    showDevGenreInfo: boolean;
    showDevYearInfo: boolean;
    showHelperLabels: boolean;
    showMiniStandings: boolean;
    showPhaseChip: boolean;
    showRoomCodeChip: boolean;
    showTimelineHints: boolean;
    showTurnNumberChip: boolean;
    theme: ThemeId;
    updateViewPreferences: UseGamePageControllerResult["updateViewPreferences"];
  };
  timelineState: {
    selectedSlotIndex: number;
    setSelectedSlotIndex: (slotIndex: number) => void;
    setTimelineView: (view: TimelineView) => void;
    timelineView: TimelineView;
    visibleChallengeChosenSlot: number | null;
    visibleOriginalChosenSlot: number | null;
    visiblePreviewCard: UseGamePageControllerResult["visiblePreviewCard"];
    visiblePreviewSlot: number | null;
    visibleTimelineCardCount: number;
    visibleTimelineCards: UseGamePageControllerResult["visibleTimelineCards"];
    visibleTimelineHint: string;
    visibleTimelineTtCount: number;
    visibleTimelineTitle: string;
  };
}

export function buildGamePageControllerResult({
  actionState,
  capabilityState,
  displayState,
  errorMessage,
  playerState,
  preferenceState,
  timelineState,
}: BuildGamePageControllerResultOptions): UseGamePageControllerResult {
  return {
    ...actionState,
    ...capabilityState,
    ...displayState,
    ...playerState,
    ...preferenceState,
    ...timelineState,
    errorMessage,
  };
}
