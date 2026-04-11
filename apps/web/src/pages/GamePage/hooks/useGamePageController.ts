import {
  BUY_TIMELINE_CARD_TT_COST,
  ClientToServerEvent,
  SKIP_TRACK_TT_COST,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type RoomClosedPayload,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useUiPreferencesStore } from "../../../features/preferences/uiPreferences";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../../services/session/playerSession";
import { socketClient } from "../../../services/socket/socketClient";
import type {
  GamePageController,
  GameRouteState,
} from "../GamePage.types";
import { createGameMenuTabs } from "../gamePageMenuTabs";

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
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    routeState.currentPlayerId ?? null,
  );
  const [roomState, setRoomState] = useState<PublicRoomState | null>(
    routeState.roomState ?? null,
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [locallyPlacedCard, setLocallyPlacedCard] = useState<
    PublicRoomState["currentTrackCard"] | null
  >(null);
  const [timelineView, setTimelineView] = useState<"active" | "mine">("active");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());
  const showMiniStandings = useUiPreferencesStore(
    (state) => state.view.showMiniStandings,
  );
  const updateViewPreferences = useUiPreferencesStore(
    (state) => state.updateViewPreferences,
  );
  const showRoomCodeChip = useUiPreferencesStore(
    (state) => state.view.showRoomCodeChip,
  );
  const showPhaseChip = useUiPreferencesStore(
    (state) => state.view.showPhaseChip,
  );
  const showTurnNumberChip = useUiPreferencesStore(
    (state) => state.view.showTurnNumberChip,
  );
  const showHelperLabels = useUiPreferencesStore(
    (state) => state.view.showHelperLabels,
  );
  const showTimelineHints = useUiPreferencesStore(
    (state) => state.view.showTimelineHints,
  );
  const showDevCardInfo = useUiPreferencesStore(
    (state) => state.showDevCardInfo,
  );
  const showDevYearInfo = useUiPreferencesStore(
    (state) => state.showDevYearInfo,
  );
  const showDevAlbumInfo = useUiPreferencesStore(
    (state) => state.showDevAlbumInfo,
  );
  const showDevGenreInfo = useUiPreferencesStore(
    (state) => state.showDevGenreInfo,
  );
  const hiddenCardMode = useUiPreferencesStore(
    (state) => state.hiddenCardMode,
  );
  const theme = useUiPreferencesStore((state) => state.theme);

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

  const isHost = roomState?.hostId === currentPlayerId;
  const isCurrentPlayerTurn =
    Boolean(currentPlayerId) &&
    roomState?.turn?.activePlayerId === currentPlayerId;
  const isChallengeOwner =
    Boolean(currentPlayerId) &&
    roomState?.challengeState?.challengerPlayerId === currentPlayerId;
  const canSelectTurnSlot = roomState?.status === "turn" && isCurrentPlayerTurn;
  const canSelectChallengeSlot =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "claimed" &&
    isChallengeOwner;
  const canSelectSlot = canSelectTurnSlot || canSelectChallengeSlot;
  const canClaimChallenge =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    !isCurrentPlayerTurn &&
    roomState.challengeState.originalPlayerId !== currentPlayerId;
  const canResolveChallengeWindow =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    roomState.hostId === currentPlayerId;
  const canConfirmReveal =
    roomState?.status === "reveal" &&
    (roomState.settings.revealConfirmMode === "host_or_active_player"
      ? isCurrentPlayerTurn || roomState.hostId === currentPlayerId
      : roomState.hostId === currentPlayerId);

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

    if (roomState?.turn?.activePlayerId === currentPlayerId) {
      setTimelineView("active");
    }
  }, [currentPlayerId, roomState?.turn?.activePlayerId]);

  useEffect(() => {
    if (roomState?.status === "turn") {
      setLocallyPlacedCard(null);
    }
  }, [roomState?.status, roomState?.turn?.turnNumber]);

  useEffect(() => {
    if (!roomId || !rememberedDisplayName) {
      navigate("/");
      return;
    }

    function handleConnect() {
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        roomId,
        displayName: rememberedDisplayName,
        sessionId: playerSessionId,
      });
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);
      setSelectedSlotIndex(0);
      setErrorMessage(null);
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    function handleRoomClosed(_: RoomClosedPayload) {
      navigate("/");
    }

    socketClient.on("connect", handleConnect);
    socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
    socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);
    socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
    socketClient.on(ServerToClientEvent.Error, handleError);

    if (!socketClient.connected) {
      socketClient.connect();
    } else {
      handleConnect();
    }

    return () => {
      socketClient.off("connect", handleConnect);
      socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
    };
  }, [navigate, playerSessionId, rememberedDisplayName, roomId]);

  useEffect(() => {
    if (
      roomState?.status !== "challenge" ||
      !roomState.challengeState?.challengeDeadlineEpochMs
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowEpochMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomState]);

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

  function emitRoomEvent<TPayload>(
    event: (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent],
    payload: TPayload,
  ) {
    socketClient.emit(event, payload);
  }

  function handlePlaceCard() {
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) {
      return;
    }

    setLocallyPlacedCard(roomState.currentTrackCard ?? null);
    emitRoomEvent(ClientToServerEvent.PlaceCard, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleConfirmReveal() {
    if (!roomState || !canConfirmReveal) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.ConfirmReveal, {
      roomId: roomState.roomId,
    });
  }

  function handleClaimChallenge() {
    if (!roomState || !canClaimChallenge) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.ClaimChallenge, {
      roomId: roomState.roomId,
    });
  }

  function handlePlaceChallenge() {
    if (!roomState || !canSelectChallengeSlot) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.PlaceChallenge, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleResolveChallengeWindow() {
    if (!roomState || !canResolveChallengeWindow) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.ResolveChallengeWindow, {
      roomId: roomState.roomId,
    });
  }

  function handleCloseRoom() {
    if (!roomState || roomState.hostId !== currentPlayerId) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
    });
  }

  function handleAwardTt(playerId: string) {
    if (
      !roomState ||
      roomState.hostId !== currentPlayerId ||
      !roomState.settings.ttModeEnabled
    ) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.AwardTt, {
      roomId: roomState.roomId,
      playerId,
      amount: 1,
    });
  }

  function handleSkipTrackWithTt() {
    if (
      !roomState ||
      !roomState.settings.ttModeEnabled ||
      roomState.status !== "turn" ||
      !isCurrentPlayerTurn
    ) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.SkipTrackWithTt, {
      roomId: roomState.roomId,
    });
  }

  function handleBuyTimelineCardWithTt() {
    if (
      !roomState ||
      !roomState.settings.ttModeEnabled ||
      roomState.status !== "turn" ||
      !isCurrentPlayerTurn
    ) {
      return;
    }

    emitRoomEvent(ClientToServerEvent.BuyTimelineCardWithTt, {
      roomId: roomState.roomId,
    });
  }

  const challengeCountdownLabel = useMemo(() => {
    const deadlineEpochMs = roomState?.challengeState?.challengeDeadlineEpochMs;

    if (
      !deadlineEpochMs ||
      roomState?.status !== "challenge" ||
      roomState.challengeState?.phase !== "open"
    ) {
      return null;
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((deadlineEpochMs - nowEpochMs) / 1000),
    );

    return `${remainingSeconds}s left to call Beat!`;
  }, [nowEpochMs, roomState]);

  const activeTimelineHint =
    roomState?.status === "challenge" && canSelectChallengeSlot
      ? `You called Beat! Pick the slot where the card should have gone in ${getPossessivePlayerName(activePlayer?.id)} timeline.`
      : roomState?.status === "challenge" && isCurrentPlayerTurn
        ? "Challenge window is open. Other players can decide whether to use Beat! against your choice."
        : canSelectTurnSlot
          ? "Tap a slot to preview your decision directly in the timeline, then confirm it."
          : roomState?.status === "challenge" &&
              roomState.challengeState?.phase === "claimed"
            ? `${getPlayerName(challengeOwner?.id)} claimed Beat! first and is choosing the challenge slot now.`
            : roomState?.status === "challenge"
              ? `${getPlayerName(roomState.challengeState?.originalPlayerId)} chose a slot. If you think it is wrong, press Beat! before the window ends.`
              : "This is the timeline being judged on this turn.";
  const activeTimelineOriginalSlot =
    roomState?.status === "challenge"
      ? roomState.challengeState?.originalSelectedSlotIndex ?? null
      : roomState?.status === "reveal"
        ? roomState.revealState?.selectedSlotIndex ?? null
        : canSelectTurnSlot
          ? selectedSlotIndex
          : null;
  const activeTimelineChallengeSlot =
    roomState?.status === "challenge" && canSelectChallengeSlot
      ? selectedSlotIndex
      : roomState?.status === "reveal"
        ? roomState.revealState?.challengerSelectedSlotIndex ?? null
        : null;
  const activeTimelinePreviewSlot =
    canSelectTurnSlot || roomState?.status === "challenge"
      ? canSelectChallengeSlot
        ? selectedSlotIndex
        : activeTimelineOriginalSlot
      : null;
  const activeTimelinePreviewCard =
    roomState?.status === "challenge"
      ? roomState.currentTrackCard ?? locallyPlacedCard
      : canSelectTurnSlot
        ? roomState?.currentTrackCard ?? null
        : null;
  const statusBadgeText = roomState?.winnerPlayerId
    ? "Game finished"
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? "Your turn"
        : `${getPlayerName(activePlayer?.id)}'s turn`
      : roomState?.status === "challenge"
        ? roomState.challengeState?.originalPlayerId === currentPlayerId
          ? "Your placement is under Beat!"
          : roomState.challengeState?.phase === "claimed"
            ? `${getPlayerName(challengeOwner?.id)} owns Beat!`
            : "Beat! window is open"
        : roomState?.status === "reveal"
          ? "Reveal"
          : "Game room";
  const statusDetailText = roomState?.winnerPlayerId
    ? `${getPlayerName(roomState.winnerPlayerId)} reached the win target first.`
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? "Choose a slot in your timeline, then confirm your placement."
        : `${getPlayerName(activePlayer?.id)} is deciding where the current song belongs.`
      : roomState?.status === "challenge"
        ? roomState.challengeState?.phase === "claimed"
          ? roomState.challengeState.challengerPlayerId === currentPlayerId
            ? "You claimed Beat! Choose the slot you believe is correct."
            : `${getPlayerName(challengeOwner?.id)} claimed Beat! and is placing the answer now.`
          : isCurrentPlayerTurn
            ? "Your placement is locked while other players decide whether to challenge it."
            : `Beat! is open against ${getPossessivePlayerName(
                roomState.challengeState?.originalPlayerId,
              )} placement.`
        : roomState?.status === "reveal"
          ? "Check the result, then wait for the allowed player to confirm reveal."
          : "The room is in sync and ready.";
  const challengeActionTitle =
    roomState?.status === "challenge" && roomState.challengeState
      ? roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? "Challenge window open"
          : "Beat available"
        : challengeOwner?.id === currentPlayerId
          ? "Place your Beat"
          : `${getPlayerName(challengeOwner?.id)} is placing Beat`
      : null;
  const challengeActionBody =
    roomState?.status === "challenge" && roomState.challengeState
      ? roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? "Other players can still challenge this placement."
          : `Chosen slot: ${roomState.challengeState.originalSelectedSlotIndex}`
        : canSelectChallengeSlot
          ? "Choose the slot you believe is right, then confirm."
          : "Waiting for the challenge placement."
      : null;
  const revealPreviewCard =
    roomState?.status === "reveal" &&
    roomState.revealState &&
    !roomState.settings.ttModeEnabled &&
    !roomState.revealState.wasCorrect
      ? roomState.revealState.placedCard
      : null;
  const revealPreviewSlot =
    roomState?.status === "reveal" &&
    roomState.revealState &&
    !roomState.settings.ttModeEnabled &&
    !roomState.revealState.wasCorrect
      ? roomState.revealState.validSlotIndexes[0] ?? null
      : null;
  const showCorrectionPreview =
    roomState?.status === "reveal" &&
    roomState.revealState &&
    !roomState.settings.ttModeEnabled &&
    !roomState.revealState.wasCorrect;
  const showCorrectPlacementPreview =
    roomState?.status === "reveal" &&
    roomState.revealState &&
    !roomState.settings.ttModeEnabled &&
    roomState.revealState.wasCorrect;
  const showOwnTimeline =
    Boolean(currentPlayerId) && currentPlayerId !== activePlayer?.id;
  const challengeMarkerTone =
    roomState?.status === "reveal" && roomState.revealState?.challengerPlayerId
      ? roomState.revealState.challengeWasSuccessful
        ? "success"
        : "failure"
      : "pending";
  const challengeSuccessCelebrationCard =
    roomState?.status === "reveal" &&
    roomState.revealState?.challengerPlayerId === currentPlayerId &&
    roomState.revealState.challengeWasSuccessful
      ? roomState.revealState.placedCard
      : null;
  const challengeSuccessCelebrationKey =
    roomState?.status === "reveal" &&
    roomState.revealState?.challengerPlayerId === currentPlayerId &&
    roomState.revealState.challengeWasSuccessful
      ? [
          roomState.roomId,
          roomState.turn?.turnNumber ?? "reveal",
          roomState.revealState.playerId,
          roomState.revealState.placedCard.id,
          roomState.revealState.challengerSelectedSlotIndex ?? "challenge",
        ].join(":")
      : null;
  const challengeSuccessMessage =
    challengeSuccessCelebrationCard ? "Clean Beat!" : null;
  const canToggleTimelineView = showOwnTimeline;
  const isViewingOwnTimeline = canToggleTimelineView && timelineView === "mine";
  const visibleTimelineCards = isViewingOwnTimeline
    ? currentPlayerTimeline
    : activePlayerTimeline;
  const visibleTimelineTitle = isViewingOwnTimeline
    ? "Your timeline"
    : `${getPossessivePlayerName(activePlayer?.id)} timeline`;
  const visibleTimelineHint = isViewingOwnTimeline
    ? "This is your personal timeline. Switch back to the active timeline any time."
    : activeTimelineHint;
  const visiblePreviewCard = isViewingOwnTimeline
    ? null
    : revealPreviewCard ?? activeTimelinePreviewCard;
  const visiblePreviewSlot = isViewingOwnTimeline
    ? null
    : revealPreviewSlot ?? activeTimelinePreviewSlot;
  const visibleOriginalChosenSlot = isViewingOwnTimeline
    ? roomState?.status === "reveal" &&
      roomState.revealState?.awardedPlayerId === currentPlayerId &&
      !roomState.revealState.challengerPlayerId
      ? roomState.revealState.awardedSlotIndex
      : null
    : activeTimelineOriginalSlot;
  const visibleChallengeChosenSlot = isViewingOwnTimeline
    ? roomState?.status === "reveal" &&
      roomState.revealState?.awardedPlayerId === currentPlayerId &&
      roomState.revealState.challengerPlayerId === currentPlayerId
      ? roomState.revealState.awardedSlotIndex
      : null
    : activeTimelineChallengeSlot;
  const disabledTimelineSlots: number[] = [];
  const leadingPlayers =
    roomState?.players
      .slice()
      .sort((leftPlayer, rightPlayer) => {
        const rightScore = roomState.timelines[rightPlayer.id]?.length ?? 0;
        const leftScore = roomState.timelines[leftPlayer.id]?.length ?? 0;

        return rightScore - leftScore;
      })
      .slice(0, 3) ?? [];
  const canUseSkipTrack =
    roomState?.status === "turn" &&
    roomState.settings.ttModeEnabled &&
    isCurrentPlayerTurn &&
    !roomState.turn?.hasUsedSkipTrackWithTt &&
    (currentPlayer?.ttTokenCount ?? 0) >= SKIP_TRACK_TT_COST;
  const canUseBuyCard =
    roomState?.status === "turn" &&
    roomState.settings.ttModeEnabled &&
    isCurrentPlayerTurn &&
    (currentPlayer?.ttTokenCount ?? 0) >= BUY_TIMELINE_CARD_TT_COST;
  const canConfirmTurnPlacement =
    roomState?.status === "turn" &&
    isCurrentPlayerTurn &&
    Boolean(roomState.currentTrackCard);
  const canConfirmBeatPlacement =
    roomState?.status === "challenge" && canSelectChallengeSlot;
  const menuTabs = roomState
    ? createGameMenuTabs({
        currentPlayerId,
        onAwardTt: handleAwardTt,
        onCloseRoom: handleCloseRoom,
        roomState,
      })
    : [];

  return {
    canClaimChallenge: Boolean(canClaimChallenge),
    canConfirmBeatPlacement: Boolean(canConfirmBeatPlacement),
    canConfirmReveal: Boolean(canConfirmReveal),
    canConfirmTurnPlacement: Boolean(canConfirmTurnPlacement),
    canResolveChallengeWindow: Boolean(canResolveChallengeWindow),
    canSelectSlot: Boolean(canSelectSlot),
    canToggleTimelineView: Boolean(canToggleTimelineView),
    canUseBuyCard: Boolean(canUseBuyCard),
    canUseSkipTrack: Boolean(canUseSkipTrack),
    challengeActionBody,
    challengeActionTitle,
    challengeCountdownLabel,
    challengeMarkerTone,
    challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey,
    challengeSuccessMessage,
    currentPlayerId,
    currentPlayerTtCount: currentPlayer?.ttTokenCount ?? 0,
    disabledTimelineSlots,
    errorMessage,
    getPlayerName,
    handleBuyTimelineCardWithTt,
    handleClaimChallenge,
    handleCloseRoom,
    handleConfirmReveal,
    handlePlaceCard,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    handleSkipTrackWithTt,
    hiddenCardMode,
    isHost: Boolean(isHost),
    isViewingOwnTimeline,
    leadingPlayers,
    menuTabs,
    roomState,
    selectedSlotIndex,
    setSelectedSlotIndex,
    setTimelineView,
    showCorrectPlacementPreview: Boolean(showCorrectPlacementPreview),
    showCorrectionPreview: Boolean(showCorrectionPreview),
    showDevAlbumInfo,
    showDevCardInfo,
    showDevYearInfo,
    showDevGenreInfo,
    showHelperLabels,
    showMiniStandings,
    showPhaseChip,
    showRoomCodeChip,
    showTimelineHints,
    showTurnNumberChip,
    statusBadgeText,
    statusDetailText,
    theme,
    timelineView,
    updateViewPreferences,
    visibleChallengeChosenSlot,
    visibleOriginalChosenSlot,
    visiblePreviewCard,
    visiblePreviewSlot,
    visibleTimelineCardCount: visibleTimelineCards.length,
    visibleTimelineCards,
    visibleTimelineHint,
    visibleTimelineTitle,
  };
}
