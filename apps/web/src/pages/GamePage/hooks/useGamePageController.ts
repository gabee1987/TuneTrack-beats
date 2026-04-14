import { useMemo } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../../services/session/playerSession";
import type {
  GameRouteState,
  UseGamePageControllerResult,
} from "../GamePage.types";
import { useGamePageActionAvailability } from "./useGamePageActionAvailability";
import { useGamePageActions } from "./useGamePageActions";
import { useGamePageDerivedState } from "./useGamePageDerivedState";
import { useGamePageLocalUiState } from "./useGamePageLocalUiState";
import { useGamePagePreferencesState } from "./useGamePagePreferencesState";
import { useGameRoomConnection } from "./useGameRoomConnection";

interface UseGamePageControllerOptions {
  navigate: NavigateFunction;
  roomId: string | undefined;
  routeState: Partial<GameRouteState>;
}

export function useGamePageController({
  navigate,
  roomId,
  routeState,
}: UseGamePageControllerOptions): UseGamePageControllerResult {
  const playerSessionId = useMemo(() => getOrCreatePlayerSessionId(), []);
  const rememberedDisplayName = useMemo(
    () => getRememberedPlayerDisplayName(),
    [],
  );
  const preferencesState = useGamePagePreferencesState();

  const {
    currentPlayerId,
    errorMessage,
    nowEpochMs,
    roomState,
  } = useGameRoomConnection({
    navigate,
    roomId,
    routeState,
    playerSessionId,
    rememberedDisplayName,
  });

  const actionAvailability = useGamePageActionAvailability({
    currentPlayerId,
    roomState,
  });

  const {
    locallyPlacedCard,
    selectedSlotIndex,
    setLocallyPlacedCard,
    setSelectedSlotIndex,
    setTimelineView,
    timelineView,
  } = useGamePageLocalUiState({
    currentPlayerId,
    roomState,
  });

  const actions = useGamePageActions({
    canClaimChallenge: actionAvailability.canClaimChallenge,
    canConfirmReveal: actionAvailability.canConfirmReveal,
    canResolveChallengeWindow: actionAvailability.canResolveChallengeWindow,
    canSelectChallengeSlot: actionAvailability.canSelectChallengeSlot,
    currentPlayerId,
    isCurrentPlayerTurn: actionAvailability.isCurrentPlayerTurn,
    roomState,
    selectedSlotIndex,
    setLocallyPlacedCard,
  });

  const derivedState = useGamePageDerivedState({
    currentPlayerId,
    handlers: {
      handleAwardTt: actions.handleAwardTt,
      handleCloseRoom: actions.handleCloseRoom,
    },
    locallyPlacedCard,
    nowEpochMs,
    roomState,
    selectedSlotIndex,
    showDevAlbumInfo: preferencesState.showDevAlbumInfo,
    showDevCardInfo: preferencesState.showDevCardInfo,
    showDevGenreInfo: preferencesState.showDevGenreInfo,
    showDevYearInfo: preferencesState.showDevYearInfo,
    showHelperLabels: preferencesState.showHelperLabels,
    showMiniStandings: preferencesState.showMiniStandings,
    showPhaseChip: preferencesState.showPhaseChip,
    showRoomCodeChip: preferencesState.showRoomCodeChip,
    showTimelineHints: preferencesState.showTimelineHints,
    showTurnNumberChip: preferencesState.showTurnNumberChip,
    theme: preferencesState.theme,
    timelineView,
    updateViewPreferences: preferencesState.updateViewPreferences,
  });

  const actionState = {
    handleBuyTimelineCardWithTt: actions.handleBuyTimelineCardWithTt,
    handleClaimChallenge: actions.handleClaimChallenge,
    handleCloseRoom: actions.handleCloseRoom,
    handleConfirmReveal: actions.handleConfirmReveal,
    handlePlaceCard: actions.handlePlaceCard,
    handlePlaceChallenge: actions.handlePlaceChallenge,
    handleResolveChallengeWindow: actions.handleResolveChallengeWindow,
    handleSkipTrackWithTt: actions.handleSkipTrackWithTt,
  };

  const capabilityState = {
    canClaimChallenge: derivedState.canClaimChallenge,
    canConfirmBeatPlacement: derivedState.canConfirmBeatPlacement,
    canConfirmReveal: derivedState.canConfirmReveal,
    canConfirmTurnPlacement: derivedState.canConfirmTurnPlacement,
    canResolveChallengeWindow: derivedState.canResolveChallengeWindow,
    canSelectSlot: derivedState.canSelectSlot,
    canToggleTimelineView: derivedState.canToggleTimelineView,
    canUseBuyCard: derivedState.canUseBuyCard,
    canUseSkipTrack: derivedState.canUseSkipTrack,
  };

  const displayState = {
    challengeActionBody: derivedState.challengeActionBody,
    challengeActionTitle: derivedState.challengeActionTitle,
    challengeCountdownLabel: derivedState.challengeCountdownLabel,
    challengeMarkerTone: derivedState.challengeMarkerTone,
    challengeSuccessCelebrationCard: derivedState.challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey: derivedState.challengeSuccessCelebrationKey,
    challengeSuccessMessage: derivedState.challengeSuccessMessage,
    disabledTimelineSlots: derivedState.disabledTimelineSlots,
    showCorrectPlacementPreview: derivedState.showCorrectPlacementPreview,
    showCorrectionPreview: derivedState.showCorrectionPreview,
    statusBadgeText: derivedState.statusBadgeText,
    statusDetailText: derivedState.statusDetailText,
  };

  const preferenceState = {
    hiddenCardMode: preferencesState.hiddenCardMode,
    showDevAlbumInfo: derivedState.showDevAlbumInfo,
    showDevCardInfo: derivedState.showDevCardInfo,
    showDevGenreInfo: derivedState.showDevGenreInfo,
    showDevYearInfo: derivedState.showDevYearInfo,
    showHelperLabels: derivedState.showHelperLabels,
    showMiniStandings: derivedState.showMiniStandings,
    showPhaseChip: derivedState.showPhaseChip,
    showRoomCodeChip: derivedState.showRoomCodeChip,
    showTimelineHints: derivedState.showTimelineHints,
    showTurnNumberChip: derivedState.showTurnNumberChip,
    theme: preferencesState.theme,
    updateViewPreferences: preferencesState.updateViewPreferences,
  };

  const timelineState = {
    selectedSlotIndex,
    setSelectedSlotIndex,
    setTimelineView,
    timelineView,
    visibleChallengeChosenSlot: derivedState.visibleChallengeChosenSlot,
    visibleOriginalChosenSlot: derivedState.visibleOriginalChosenSlot,
    visiblePreviewCard: derivedState.visiblePreviewCard,
    visiblePreviewSlot: derivedState.visiblePreviewSlot,
    visibleTimelineCardCount: derivedState.visibleTimelineCardCount,
    visibleTimelineCards: derivedState.visibleTimelineCards,
    visibleTimelineHint: derivedState.visibleTimelineHint,
    visibleTimelineTitle: derivedState.visibleTimelineTitle,
  };

  const playerState = {
    currentPlayerId,
    currentPlayerTtCount: derivedState.currentPlayer?.ttTokenCount ?? 0,
    getPlayerName: derivedState.getPlayerName,
    isHost: Boolean(actionAvailability.isHost),
    isViewingOwnTimeline: derivedState.isViewingOwnTimeline,
    leadingPlayers: derivedState.leadingPlayers,
    menuTabs: derivedState.menuTabs,
    roomState,
  };

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
