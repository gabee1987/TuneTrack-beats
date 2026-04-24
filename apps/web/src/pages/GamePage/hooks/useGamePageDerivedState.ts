import { type PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
  GamePageViewPreferenceUpdater,
  TimelineCelebrationTone,
  TimelineView,
} from "../GamePage.types";
import type { AppShellMenuTab } from "../../../features/app-shell/AppShellMenu";
import type { ThemeId } from "../../../features/preferences/uiPreferences";
import { useGamePageCapabilityState } from "./useGamePageCapabilityState";
import { useGamePageDisplayState } from "./useGamePageDisplayState";
import { useGamePagePlayerState } from "./useGamePagePlayerState";
import { useGamePageTimelineViewMode } from "./useGamePageTimelineViewMode";

interface UseGamePageDerivedStateOptions {
  currentPlayerId: string | null;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  theme: ThemeId;
  timelineView: TimelineView;
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
  updateViewPreferences: GamePageViewPreferenceUpdater;
  handlers: {
    handleAwardTt: (playerId: string) => void;
    handleRemoveTt: (playerId: string) => void;
    handleCloseRoom: () => void;
  };
}

interface GamePageDerivedPlayerState {
  activePlayer: PublicRoomState["players"][number] | undefined;
  challengeOwner: PublicRoomState["players"][number] | undefined;
  currentPlayer: PublicRoomState["players"][number] | undefined;
  getPlayerName: GamePagePlayerNameResolver;
  isChallengeOwner: boolean;
  isCurrentPlayerTurn: boolean;
  leadingPlayers: PublicRoomState["players"];
}

interface GamePageDerivedInteractionState {
  canChangeTimelineView: boolean;
  canClaimChallenge: boolean;
  canConfirmBeatPlacement: boolean;
  canConfirmReveal: boolean;
  canConfirmTurnPlacement: boolean;
  canResolveChallengeWindow: boolean;
  canSelectChallengeSlot: boolean;
  canSelectSlot: boolean;
  canToggleTimelineView: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  isViewingOwnTimeline: boolean;
}

interface GamePageDerivedChallengeState {
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  challengeSuccessCelebrationCard: GamePageCard | null;
  challengeSuccessCelebrationKey: string | null;
  challengeSuccessMessage: string | null;
  challengeSuccessTone: TimelineCelebrationTone;
  shouldAnimateCelebrationCardToMine: boolean;
  disabledTimelineSlots: number[];
  revealPreviewTransitionKey: string | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  statusBadgeText: string;
  statusDetailText: string;
  visibleChallengeChosenSlot: number | null;
  visibleOriginalChosenSlot: number | null;
}

interface GamePageDerivedPreferenceState {
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
  timelineView: TimelineView;
  updateViewPreferences: GamePageViewPreferenceUpdater;
}

interface GamePageDerivedTimelineViewState {
  menuTabs: AppShellMenuTab[];
  visiblePreviewCard: GamePageCard | null;
  visiblePreviewSlot: number | null;
  visibleTimelineCardCount: number;
  visibleTimelineCards: PublicRoomState["timelines"][string];
  visibleTimelineHint: string;
  visibleTimelineTtCount: number;
  visibleTimelineTitle: string;
}

type UseGamePageDerivedStateResult = GamePageDerivedPlayerState &
  GamePageDerivedInteractionState &
  GamePageDerivedChallengeState &
  GamePageDerivedPreferenceState &
  GamePageDerivedTimelineViewState;

export function useGamePageDerivedState({
  currentPlayerId,
  handlers,
  locallyPlacedCard,
  nowEpochMs,
  roomState,
  selectedSlotIndex,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevGenreInfo,
  showDevYearInfo,
  showHelperLabels,
  showMiniStandings,
  showPhaseChip,
  showRoomCodeChip,
  showTimelineHints,
  showTurnNumberChip,
  theme,
  timelineView,
  updateViewPreferences,
}: UseGamePageDerivedStateOptions): UseGamePageDerivedStateResult {
  const {
    activePlayer,
    activePlayerTimeline,
    challengeOwner,
    currentPlayer,
    currentPlayerTimeline,
    getPlayerName,
    getPossessivePlayerName,
    showOwnTimeline,
  } = useGamePagePlayerState({
    currentPlayerId,
    roomState,
  });

  const capabilityState = useGamePageCapabilityState({
    currentPlayerId,
    currentPlayerTtCount: currentPlayer?.ttTokenCount ?? 0,
    handlers,
    roomState,
  });
  const {
    canChangeTimelineView,
    canToggleTimelineView,
    isViewingOwnTimeline,
  } = useGamePageTimelineViewMode({
    canSelectChallengeSlot: capabilityState.canSelectChallengeSlot,
    showOwnTimeline,
    timelineView,
  });
  const displayState = useGamePageDisplayState({
    activePlayerId: activePlayer?.id,
    activePlayerTtCount: activePlayer?.ttTokenCount ?? 0,
    activePlayerTimeline,
    canSelectChallengeSlot: capabilityState.canSelectChallengeSlot,
    canSelectTurnSlot: capabilityState.canSelectTurnSlot,
    challengeOwnerId: challengeOwner?.id,
    currentPlayerId,
    currentPlayerTtCount: currentPlayer?.ttTokenCount ?? 0,
    currentPlayerTimeline,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn: capabilityState.isCurrentPlayerTurn,
    isViewingOwnTimeline,
    locallyPlacedCard,
    nowEpochMs,
    roomState,
    selectedSlotIndex,
  });

  const playerState = {
    activePlayer,
    challengeOwner,
    currentPlayer,
    getPlayerName,
    isChallengeOwner: capabilityState.isChallengeOwner,
    isCurrentPlayerTurn: capabilityState.isCurrentPlayerTurn,
    leadingPlayers: capabilityState.leadingPlayers,
  };

  const interactionState = {
    canChangeTimelineView,
    canClaimChallenge: capabilityState.canClaimChallenge,
    canConfirmBeatPlacement: capabilityState.canConfirmBeatPlacement,
    canConfirmReveal: capabilityState.canConfirmReveal,
    canConfirmTurnPlacement: capabilityState.canConfirmTurnPlacement,
    canResolveChallengeWindow: capabilityState.canResolveChallengeWindow,
    canSelectChallengeSlot: capabilityState.canSelectChallengeSlot,
    canSelectSlot: capabilityState.canSelectSlot,
    canToggleTimelineView,
    canUseBuyCard: capabilityState.canUseBuyCard,
    canUseSkipTrack: capabilityState.canUseSkipTrack,
    isViewingOwnTimeline,
  };

  const challengeState = {
    challengeActionBody: displayState.challengeActionBody,
    challengeActionTitle: displayState.challengeActionTitle,
    challengeCountdownLabel: displayState.challengeCountdownLabel,
    challengeMarkerTone: displayState.challengeMarkerTone,
    challengeSuccessCelebrationCard: displayState.challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey: displayState.challengeSuccessCelebrationKey,
    challengeSuccessMessage: displayState.challengeSuccessMessage,
    challengeSuccessTone: displayState.challengeSuccessTone,
    shouldAnimateCelebrationCardToMine: displayState.shouldAnimateCelebrationCardToMine,
    disabledTimelineSlots: displayState.disabledTimelineSlots,
    revealPreviewTransitionKey: displayState.revealPreviewTransitionKey,
    showCorrectPlacementPreview: displayState.showCorrectPlacementPreview,
    showCorrectionPreview: displayState.showCorrectionPreview,
    statusBadgeText: displayState.statusBadgeText,
    statusDetailText: displayState.statusDetailText,
    visibleChallengeChosenSlot: displayState.visibleChallengeChosenSlot,
    visibleOriginalChosenSlot: displayState.visibleOriginalChosenSlot,
  };

  const preferenceState = {
    showDevAlbumInfo,
    showDevCardInfo,
    showDevGenreInfo,
    showDevYearInfo,
    showHelperLabels,
    showMiniStandings,
    showPhaseChip,
    showRoomCodeChip,
    showTimelineHints,
    showTurnNumberChip,
    theme,
    timelineView,
    updateViewPreferences,
  };

  const timelineViewState = {
    menuTabs: capabilityState.menuTabs,
    visiblePreviewCard: displayState.visiblePreviewCard,
    visiblePreviewSlot: displayState.visiblePreviewSlot,
    visibleTimelineCardCount: displayState.visibleTimelineCardCount,
    visibleTimelineCards: displayState.visibleTimelineCards,
    visibleTimelineHint: displayState.visibleTimelineHint,
    visibleTimelineTtCount: displayState.visibleTimelineTtCount,
    visibleTimelineTitle: displayState.visibleTimelineTitle,
  };

  return {
    ...playerState,
    ...interactionState,
    ...challengeState,
    ...preferenceState,
    ...timelineViewState,
  };
}
