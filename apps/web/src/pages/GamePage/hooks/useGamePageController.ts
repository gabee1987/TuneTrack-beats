import { useMemo } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../../services/session/playerSession";
import type {
  GamePageController,
  GameRouteState,
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
}: UseGamePageControllerOptions): GamePageController & {
  canClaimChallenge: boolean;
  canResolveChallengeWindow: boolean;
  getPlayerName: (playerId: string | null | undefined) => string;
} {
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

  return {
    canClaimChallenge: Boolean(derivedState.canClaimChallenge),
    canConfirmBeatPlacement: Boolean(derivedState.canConfirmBeatPlacement),
    canConfirmReveal: Boolean(derivedState.canConfirmReveal),
    canConfirmTurnPlacement: Boolean(derivedState.canConfirmTurnPlacement),
    canResolveChallengeWindow: Boolean(derivedState.canResolveChallengeWindow),
    canSelectSlot: Boolean(derivedState.canSelectSlot),
    canToggleTimelineView: Boolean(derivedState.canToggleTimelineView),
    canUseBuyCard: Boolean(derivedState.canUseBuyCard),
    canUseSkipTrack: Boolean(derivedState.canUseSkipTrack),
    challengeActionBody: derivedState.challengeActionBody,
    challengeActionTitle: derivedState.challengeActionTitle,
    challengeCountdownLabel: derivedState.challengeCountdownLabel,
    challengeMarkerTone: derivedState.challengeMarkerTone,
    challengeSuccessCelebrationCard: derivedState.challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey: derivedState.challengeSuccessCelebrationKey,
    challengeSuccessMessage: derivedState.challengeSuccessMessage,
    currentPlayerId,
    currentPlayerTtCount: derivedState.currentPlayer?.ttTokenCount ?? 0,
    disabledTimelineSlots: derivedState.disabledTimelineSlots,
    errorMessage,
    getPlayerName: derivedState.getPlayerName,
    handleBuyTimelineCardWithTt: actions.handleBuyTimelineCardWithTt,
    handleClaimChallenge: actions.handleClaimChallenge,
    handleCloseRoom: actions.handleCloseRoom,
    handleConfirmReveal: actions.handleConfirmReveal,
    handlePlaceCard: actions.handlePlaceCard,
    handlePlaceChallenge: actions.handlePlaceChallenge,
    handleResolveChallengeWindow: actions.handleResolveChallengeWindow,
    handleSkipTrackWithTt: actions.handleSkipTrackWithTt,
    hiddenCardMode: preferencesState.hiddenCardMode,
    isHost: Boolean(actionAvailability.isHost),
    isViewingOwnTimeline: derivedState.isViewingOwnTimeline,
    leadingPlayers: derivedState.leadingPlayers,
    menuTabs: derivedState.menuTabs,
    roomState,
    selectedSlotIndex,
    setSelectedSlotIndex,
    setTimelineView,
    showCorrectPlacementPreview: Boolean(derivedState.showCorrectPlacementPreview),
    showCorrectionPreview: Boolean(derivedState.showCorrectionPreview),
    showDevAlbumInfo: derivedState.showDevAlbumInfo,
    showDevCardInfo: derivedState.showDevCardInfo,
    showDevYearInfo: derivedState.showDevYearInfo,
    showDevGenreInfo: derivedState.showDevGenreInfo,
    showHelperLabels: derivedState.showHelperLabels,
    showMiniStandings: derivedState.showMiniStandings,
    showPhaseChip: derivedState.showPhaseChip,
    showRoomCodeChip: derivedState.showRoomCodeChip,
    showTimelineHints: derivedState.showTimelineHints,
    showTurnNumberChip: derivedState.showTurnNumberChip,
    statusBadgeText: derivedState.statusBadgeText,
    statusDetailText: derivedState.statusDetailText,
    theme: preferencesState.theme,
    timelineView,
    updateViewPreferences: preferencesState.updateViewPreferences,
    visibleChallengeChosenSlot: derivedState.visibleChallengeChosenSlot,
    visibleOriginalChosenSlot: derivedState.visibleOriginalChosenSlot,
    visiblePreviewCard: derivedState.visiblePreviewCard,
    visiblePreviewSlot: derivedState.visiblePreviewSlot,
    visibleTimelineCardCount: derivedState.visibleTimelineCardCount,
    visibleTimelineCards: derivedState.visibleTimelineCards,
    visibleTimelineHint: derivedState.visibleTimelineHint,
    visibleTimelineTitle: derivedState.visibleTimelineTitle,
  };
}
