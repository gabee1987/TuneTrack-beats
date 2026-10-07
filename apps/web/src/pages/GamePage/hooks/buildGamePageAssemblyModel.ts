import type { PublicRoomState } from "@tunetrack/shared";
import type { GamePageAssemblyModel, LoadedGamePageController } from "../GamePage.types";

// The player a host may skip: the claimed challenger during a challenge, else the active player.
function getSkipCandidateName(roomState: PublicRoomState): string | null {
  const skipCandidateId =
    roomState.status === "challenge"
      ? roomState.challengeState?.challengerPlayerId
      : roomState.turn?.activePlayerId;
  return roomState.players.find((player) => player.id === skipCandidateId)?.displayName ?? null;
}

// Scalars rather than `roomState`, so the memoised header and action panels skip a
// `state_update` that changes nothing they show (05 §3).
export function buildGamePageAssemblyModel(
  controller: LoadedGamePageController,
): GamePageAssemblyModel {
  const { roomState } = controller;
  const challengeState = roomState.status === "challenge" ? roomState.challengeState : null;

  return {
    actions: {
      buyTimelineCardActionStatus: controller.buyTimelineCardActionStatus,
      canClaimChallenge: controller.canClaimChallenge,
      canConfirmBeatPlacement: controller.canConfirmBeatPlacement,
      canConfirmReveal: controller.canConfirmReveal,
      canConfirmTurnPlacement: controller.canConfirmTurnPlacement,
      canResolveChallengeWindow: controller.canResolveChallengeWindow,
      canSkipOfflinePlayer: controller.canSkipOfflinePlayer,
      canUseBuyCard: controller.canUseBuyCard,
      canUseSkipTrack: controller.canUseSkipTrack,
      challengeActionBody: controller.challengeActionBody,
      challengeActionTitle: controller.challengeActionTitle,
      claimChallengeActionStatus: controller.claimChallengeActionStatus,
      confirmRevealActionStatus: controller.confirmRevealActionStatus,
      currentPlayerId: controller.currentPlayerId,
      currentPlayerTtCount: controller.currentPlayerTtCount,
      handleBuyTimelineCardWithTt: controller.handleBuyTimelineCardWithTt,
      handleClaimChallenge: controller.handleClaimChallenge,
      handleConfirmReveal: controller.handleConfirmReveal,
      handlePlaceCard: controller.handlePlaceCard,
      handlePlaceChallenge: controller.handlePlaceChallenge,
      handleResolveChallengeWindow: controller.handleResolveChallengeWindow,
      handleSkipTrackWithTt: controller.handleSkipTrackWithTt,
      handleSkipTurn: controller.handleSkipTurn,
      isBuyTimelineCardPending: controller.isBuyTimelineCardPending,
      isCurrentPlayerTurn: controller.isCurrentPlayerTurn,
      isClaimChallengePending: controller.isClaimChallengePending,
      isConfirmRevealPending: controller.isConfirmRevealPending,
      isPlaceCardPending: controller.isPlaceCardPending,
      isPlaceChallengePending: controller.isPlaceChallengePending,
      isResolveChallengeWindowPending: controller.isResolveChallengeWindowPending,
      isSkipTrackPending: controller.isSkipTrackPending,
      isSkipTurnPending: controller.isSkipTurnPending,
      placeCardActionStatus: controller.placeCardActionStatus,
      placeChallengeActionStatus: controller.placeChallengeActionStatus,
      resolveChallengeWindowActionStatus: controller.resolveChallengeWindowActionStatus,
      skipTrackActionStatus: controller.skipTrackActionStatus,
      skipTurnActionStatus: controller.skipTurnActionStatus,
      showHelperLabels: controller.showHelperLabels,
      challengeDeadlineEpochMs: challengeState?.challengeDeadlineEpochMs ?? null,
      challengePhase: challengeState?.phase ?? null,
      skipCandidateName: getSkipCandidateName(roomState),
      status: roomState.status,
      ttModeEnabled: roomState.settings.ttModeEnabled,
      turnSkipDeadlineEpochMs: roomState.turn?.turnSkipDeadlineEpochMs ?? null,
      winnerPlayerId: roomState.winnerPlayerId,
      winnerPlayerName: controller.getPlayerName(roomState.winnerPlayerId),
    },
    header: {
      closeRoomActionStatus: controller.closeRoomActionStatus,
      currentPlayerId: controller.currentPlayerId,
      handleCloseRoom: controller.handleCloseRoom,
      handleSkipTurn: controller.handleSkipTurn,
      isCloseRoomPending: controller.isCloseRoomPending,
      isSkipTurnPending: controller.isSkipTurnPending,
      leadingPlayers: controller.leadingPlayers,
      menuTabs: controller.menuTabs,
      skipTurnActionStatus: controller.skipTurnActionStatus,
      showMiniStandings: controller.showMiniStandings,
      showPhaseChip: controller.showPhaseChip,
      showRoomCodeChip: controller.showRoomCodeChip,
      showTimelineHints: controller.showTimelineHints,
      showTurnNumberChip: controller.showTurnNumberChip,
      statusBadgeText: controller.statusBadgeText,
      statusDetailText: controller.statusDetailText,
      updateViewPreferences: controller.updateViewPreferences,
      visibleTimelineCardCount: controller.visibleTimelineCardCount,
      visibleTimelinePlayerId: controller.visibleTimelinePlayerId,
      visibleTimelineTtCount: controller.visibleTimelineTtCount,
      visibleTimelineTitle: controller.visibleTimelineTitle,
      hostId: roomState.hostId,
      roomId: roomState.roomId,
      status: roomState.status,
      ttModeEnabled: roomState.settings.ttModeEnabled,
      turnNumber: roomState.turn?.turnNumber ?? null,
    },
    timeline: {
      header: {
        canChangeTimelineView: controller.canChangeTimelineView,
        canToggleView: controller.canToggleTimelineView,
        cardCount: controller.visibleTimelineCardCount,
        onToggleTimelineView: controller.setTimelineView,
        timelineView: controller.timelineView,
        title: controller.visibleTimelineTitle,
      },
      interaction: {
        challengeMarkerTone: controller.challengeMarkerTone,
        challengerChosenSlotIndex: controller.visibleChallengeChosenSlot,
        disabledSlotIndexes: controller.disabledTimelineSlots,
        onSelectSlot: controller.setSelectedSlotIndex,
        originalChosenSlotIndex: controller.visibleOriginalChosenSlot,
        previewCard: controller.visiblePreviewCard,
        previewSlotIndex: controller.visiblePreviewSlot,
        selectable: !controller.isViewingOwnTimeline && controller.canSelectSlot,
        selectedSlotIndex: controller.selectedSlotIndex,
      },
      render: {
        hiddenCardMode: controller.hiddenCardMode,
        revealedCardMode: controller.revealedCardMode,
        hint: controller.visibleTimelineHint,
        previewCardTransitionEvent: controller.previewCardTransitionEvent,
        timelinePreviewTransitionEvent: controller.timelinePreviewTransitionEvent,
        timelineCelebrationTransitionEvent: controller.timelineCelebrationTransitionEvent,
        showCorrectPlacementPreview: controller.showCorrectPlacementPreview,
        showCorrectionPreview: controller.showCorrectionPreview,
        showDevAlbumInfo: controller.isHost && controller.showDevAlbumInfo,
        showDevCardInfo: controller.isHost && controller.showDevCardInfo,
        showDevGenreInfo: controller.isHost && controller.showDevGenreInfo,
        showDevYearInfo: controller.isHost && controller.showDevYearInfo,
        showHint: controller.showTimelineHints && controller.visibleTimelineHint.length > 0,
        isOwnTimeline:
          controller.currentPlayerId !== null &&
          controller.visibleTimelinePlayerId === controller.currentPlayerId,
        theme: controller.theme,
        timelineCards: controller.visibleTimelineCards,
        timelineView: controller.timelineView,
      },
    },
  };
}
