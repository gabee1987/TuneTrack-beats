import { type PublicRoomState } from "@tunetrack/shared";
import { useMemo } from "react";
import type { TimelineView } from "../GamePage.types";
import { useGamePageCapabilityState } from "./useGamePageCapabilityState";
import { useGamePageStatusState } from "./useGamePageStatusState";
import { useGamePageTimelineState } from "./useGamePageTimelineState";

interface UseGamePageDerivedStateOptions {
  currentPlayerId: string | null;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  theme: "dark" | "light";
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
  updateViewPreferences: (nextView: {
    showMiniStandings?: boolean;
  }) => void;
  handlers: {
    handleAwardTt: (playerId: string) => void;
    handleCloseRoom: () => void;
  };
}

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
}: UseGamePageDerivedStateOptions) {
  const activePlayer = roomState?.players.find(
    (player) => player.id === roomState.turn?.activePlayerId,
  );
  const currentPlayer = roomState?.players.find(
    (player) => player.id === currentPlayerId,
  );
  const challengeOwner = roomState?.players.find(
    (player) => player.id === roomState.challengeState?.challengerPlayerId,
  );

  const activePlayerTimeline = useMemo(() => {
    if (!roomState || !roomState.turn?.activePlayerId) {
      return [];
    }

    return roomState.timelines[roomState.turn.activePlayerId] ?? [];
  }, [roomState]);

  const currentPlayerTimeline = useMemo(() => {
    if (!roomState || !currentPlayerId) {
      return [];
    }

    return roomState.timelines[currentPlayerId] ?? [];
  }, [currentPlayerId, roomState]);

  function getPlayerName(playerId: string | null | undefined): string {
    if (!playerId) {
      return "Unknown player";
    }

    if (playerId === currentPlayerId) {
      return "You";
    }

    return (
      roomState?.players.find((player) => player.id === playerId)?.displayName ??
      "Unknown player"
    );
  }

  function getPossessivePlayerName(playerId: string | null | undefined): string {
    if (!playerId) {
      return "Unknown player's";
    }

    if (playerId === currentPlayerId) {
      return "Your";
    }

    return `${getPlayerName(playerId)}'s`;
  }

  function getChallengeSuccessCelebrationState(): {
    card: PublicRoomState["currentTrackCard"] | null;
    key: string | null;
  } {
    if (
      roomState?.status !== "reveal" ||
      roomState.revealState?.challengerPlayerId !== currentPlayerId ||
      !roomState.revealState.challengeWasSuccessful
    ) {
      return {
        card: null,
        key: null,
      };
    }

    return {
      card: roomState.revealState.placedCard,
      key: [
        roomState.roomId,
        roomState.turn?.turnNumber ?? "reveal",
        roomState.revealState.playerId,
        roomState.revealState.placedCard.id,
        roomState.revealState.challengerSelectedSlotIndex ?? "challenge",
      ].join(":"),
    };
  }

  const showOwnTimeline =
    Boolean(currentPlayerId) && currentPlayerId !== activePlayer?.id;
  const {
    card: challengeSuccessCelebrationCard,
    key: challengeSuccessCelebrationKey,
  } = getChallengeSuccessCelebrationState();
  const capabilityState = useGamePageCapabilityState({
    currentPlayerId,
    currentPlayerTtCount: currentPlayer?.ttTokenCount ?? 0,
    handlers,
    roomState,
  });
  const canToggleTimelineView = showOwnTimeline;
  const isViewingOwnTimeline = canToggleTimelineView && timelineView === "mine";
  const disabledTimelineSlots: number[] = [];

  const statusState = useGamePageStatusState({
    activePlayerId: activePlayer?.id,
    challengeOwnerId: challengeOwner?.id,
    currentPlayerId,
    canSelectChallengeSlot: capabilityState.canSelectChallengeSlot,
    challengeSuccessCelebrationCard,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn: capabilityState.isCurrentPlayerTurn,
    nowEpochMs,
    roomState,
  });

  const timelineState = useGamePageTimelineState({
    activePlayerId: activePlayer?.id,
    activePlayerTimeline,
    activeTimelineHint: statusState.activeTimelineHint,
    canSelectChallengeSlot: capabilityState.canSelectChallengeSlot,
    canSelectTurnSlot: capabilityState.canSelectTurnSlot,
    currentPlayerId,
    currentPlayerTimeline,
    getPossessivePlayerName,
    isViewingOwnTimeline,
    locallyPlacedCard,
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
    challengeActionBody: statusState.challengeActionBody,
    challengeActionTitle: statusState.challengeActionTitle,
    challengeCountdownLabel: statusState.challengeCountdownLabel,
    challengeMarkerTone: statusState.challengeMarkerTone,
    challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey,
    challengeSuccessMessage: statusState.challengeSuccessMessage,
    disabledTimelineSlots,
    showCorrectPlacementPreview: timelineState.showCorrectPlacementPreview,
    showCorrectionPreview: timelineState.showCorrectionPreview,
    statusBadgeText: statusState.statusBadgeText,
    statusDetailText: statusState.statusDetailText,
    visibleChallengeChosenSlot: timelineState.visibleChallengeChosenSlot,
    visibleOriginalChosenSlot: timelineState.visibleOriginalChosenSlot,
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
    visiblePreviewCard: timelineState.visiblePreviewCard,
    visiblePreviewSlot: timelineState.visiblePreviewSlot,
    visibleTimelineCardCount: timelineState.visibleTimelineCardCount,
    visibleTimelineCards: timelineState.visibleTimelineCards,
    visibleTimelineHint: timelineState.visibleTimelineHint,
    visibleTimelineTitle: timelineState.visibleTimelineTitle,
  };

  return {
    ...playerState,
    ...interactionState,
    ...challengeState,
    ...preferenceState,
    ...timelineViewState,
  };
}
