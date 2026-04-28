import { useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../../services/session/playerSession";
import type {
  GameRouteState,
  UseGamePageControllerResult,
} from "../GamePage.types";
import { buildGamePageControllerResult } from "./buildGamePageControllerResult";
import { useGamePageTransitionEvents } from "./transitions/useGamePageTransitionEvents";
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
  const [skipTrackSpendAnimationKey, setSkipTrackSpendAnimationKey] =
    useState(0);
  const [buyTimelineCardSpendAnimationKey, setBuyTimelineCardSpendAnimationKey] =
    useState(0);
  const [pendingSkippedTrackId, setPendingSkippedTrackId] = useState<string | null>(
    null,
  );

  const {
    currentPlayerId,
    errorKey,
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
  const currentPlayerTtCount =
    roomState?.players.find((player) => player.id === currentPlayerId)?.ttTokenCount ?? 0;

  const actionAvailability = useGamePageActionAvailability({
    currentPlayerId,
    currentPlayerTtCount,
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
    onSkipTrackWithTtIntent: (cardId) => {
      setPendingSkippedTrackId(cardId);
      setSkipTrackSpendAnimationKey((key) => key + 1);
    },
    onBuyTimelineCardWithTtIntent: () => {
      setBuyTimelineCardSpendAnimationKey((key) => key + 1);
    },
    setLocallyPlacedCard,
  });

  const derivedState = useGamePageDerivedState({
    currentPlayerId,
    handlers: {
      handleAwardTt: actions.handleAwardTt,
      handleRemoveTt: actions.handleRemoveTt,
      handleCloseRoom: actions.handleCloseRoom,
      handleKickPlayer: actions.handleKickPlayer,
      handleTransferHost: actions.handleTransferHost,
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

  const {
    previewCardTransitionEvent,
    timelinePreviewTransitionEvent,
    timelineCelebrationTransitionEvent,
  } = useGamePageTransitionEvents({
    celebrationCard: derivedState.challengeSuccessCelebrationCard,
    celebrationKey: derivedState.challengeSuccessCelebrationKey,
    celebrationMessage: derivedState.challengeSuccessMessage,
    celebrationTone: derivedState.challengeSuccessTone,
    currentTrackId: roomState?.currentTrackCard?.id ?? null,
    pendingSkippedTrackId,
    previewCard: derivedState.visiblePreviewCard,
    previewSlot: derivedState.visiblePreviewSlot,
    revealPreviewTransitionKey: derivedState.revealPreviewTransitionKey,
    roomStatus: roomState?.status ?? null,
    showCorrectPlacementPreview: derivedState.showCorrectPlacementPreview,
    showCorrectionPreview: derivedState.showCorrectionPreview,
    shouldAnimateCelebrationCardToMine:
      derivedState.shouldAnimateCelebrationCardToMine,
    onSkipTrackTransitionDetected: () => {
      setPendingSkippedTrackId(null);
    },
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
    handleSkipTurn: actions.handleSkipTurn,
    buyTimelineCardSpendAnimationKey,
    skipTrackSpendAnimationKey,
  };

  const capabilityState = {
    canChangeTimelineView: derivedState.canChangeTimelineView,
    canClaimChallenge: derivedState.canClaimChallenge,
    canConfirmBeatPlacement: derivedState.canConfirmBeatPlacement,
    canConfirmReveal: derivedState.canConfirmReveal,
    canConfirmTurnPlacement: derivedState.canConfirmTurnPlacement,
    canResolveChallengeWindow: derivedState.canResolveChallengeWindow,
    canSelectSlot: derivedState.canSelectSlot,
    canSkipOfflinePlayer: actionAvailability.canSkipOfflinePlayer,
    canToggleTimelineView: derivedState.canToggleTimelineView,
    canUseBuyCard: derivedState.canUseBuyCard,
    canUseSkipTrack: derivedState.canUseSkipTrack,
    isCurrentPlayerTurn: derivedState.isCurrentPlayerTurn,
  };

  const displayState = {
    challengeActionBody: derivedState.challengeActionBody,
    challengeActionTitle: derivedState.challengeActionTitle,
    challengeCountdownLabel: derivedState.challengeCountdownLabel,
    challengeMarkerTone: derivedState.challengeMarkerTone,
    disabledTimelineSlots: derivedState.disabledTimelineSlots,
    previewCardTransitionEvent,
    timelinePreviewTransitionEvent,
    timelineCelebrationTransitionEvent,
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
    visibleTimelinePlayerId: derivedState.visibleTimelinePlayerId,
    visibleTimelineTtCount: derivedState.visibleTimelineTtCount,
    visibleTimelineTitle: derivedState.visibleTimelineTitle,
  };

  const playerState = {
    currentPlayerId,
    currentPlayerTtCount,
    getPlayerName: derivedState.getPlayerName,
    isHost: Boolean(actionAvailability.isHost),
    isViewingOwnTimeline: derivedState.isViewingOwnTimeline,
    leadingPlayers: derivedState.leadingPlayers,
    menuTabs: derivedState.menuTabs,
    roomState,
  };

  return buildGamePageControllerResult({
    actionState,
    capabilityState,
    displayState,
    errorKey,
    errorMessage,
    playerState,
    preferenceState,
    timelineState,
  });
}
