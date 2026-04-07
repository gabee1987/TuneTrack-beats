import {
  BUY_TIMELINE_CARD_TT_COST,
  ClientToServerEvent,
  SKIP_TRACK_TT_COST,
  type PlayerIdentityPayload,
  type RoomClosedPayload,
  ServerToClientEvent,
  type PublicRoomState,
  type ServerErrorPayload,
  type StateUpdatePayload,
  type TimelineCardPublic,
  type TrackCardPublic,
} from "@tunetrack/shared";
import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../services/session/playerSession";
import { AppShellMenu } from "../../features/app-shell/AppShellMenu";
import { useUiPreferencesStore } from "../../features/preferences/uiPreferences";
import type { HiddenCardMode } from "../../features/preferences/uiPreferences";
import { socketClient } from "../../services/socket/socketClient";
import styles from "./GamePage.module.css";

interface GameRouteState {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

interface TimelinePanelProps {
  title: string;
  hint: string;
  showHint: boolean;
  cardCount: number;
  timelineCards: TimelineCardPublic[];
  previewCard: TrackCardPublic | TimelineCardPublic | null;
  previewSlotIndex: number | null;
  selectable: boolean;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  originalChosenSlotIndex: number | null;
  challengerChosenSlotIndex: number | null;
  challengeMarkerTone?: "pending" | "success" | "failure";
  disabledSlotIndexes?: number[];
  hiddenCardMode: HiddenCardMode;
  showDevCardInfo: boolean;
  showDevAlbumInfo: boolean;
  showDevGenreInfo: boolean;
}

function formatPhaseLabel(status: PublicRoomState["status"]): string {
  switch (status) {
    case "turn":
      return "Play";
    case "challenge":
      return "Challenge";
    case "reveal":
      return "Reveal";
    case "finished":
      return "Finished";
    case "lobby":
      return "Lobby";
    default:
      return "Game";
  }
}

export function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const routeState = (location.state ?? {}) as Partial<GameRouteState>;
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
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
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
  const showDevAlbumInfo = useUiPreferencesStore(
    (state) => state.showDevAlbumInfo,
  );
  const showDevGenreInfo = useUiPreferencesStore(
    (state) => state.showDevGenreInfo,
  );
  const hiddenCardMode = useUiPreferencesStore(
    (state) => state.hiddenCardMode,
  );

  const activePlayer = roomState?.players.find(
    (player) => player.id === roomState.turn?.activePlayerId,
  );
  const currentPlayer = roomState?.players.find(
    (player) => player.id === currentPlayerId,
  );
  const isHost = roomState?.hostId === currentPlayerId;
  const challengeOwner = roomState?.players.find(
    (player) => player.id === roomState.challengeState?.challengerPlayerId,
  );
  const revealChallenger = roomState?.players.find(
    (player) => player.id === roomState.revealState?.challengerPlayerId,
  );
  const awardedPlayer = roomState?.players.find(
    (player) => player.id === roomState.revealState?.awardedPlayerId,
  );
  const activePlayerTimeline = useMemo(() => {
    if (!roomState || !roomState.turn?.activePlayerId) {
      return [];
    }

    return roomState.timelines[roomState.turn.activePlayerId] ?? [];
  }, [roomState]);

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

    if (roomState?.turn?.activePlayerId === currentPlayerId) {
      setTimelineView("active");
    }
  }, [currentPlayerId, roomState?.turn?.activePlayerId]);
  const currentPlayerTimeline = useMemo(() => {
    if (!roomState || !currentPlayerId) {
      return [];
    }

    return roomState.timelines[currentPlayerId] ?? [];
  }, [currentPlayerId, roomState]);

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
  const hasUsedSkipTrackWithTt = Boolean(
    roomState?.turn?.hasUsedSkipTrackWithTt,
  );
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

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    if (!rememberedDisplayName) {
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
    if (roomState?.status !== "challenge") {
      return;
    }

    if (!roomState.challengeState?.challengeDeadlineEpochMs) {
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

  function handlePlaceCard() {
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) {
      return;
    }

    socketClient.emit(ClientToServerEvent.PlaceCard, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleConfirmReveal() {
    if (!roomState || !canConfirmReveal) {
      return;
    }

    socketClient.emit(ClientToServerEvent.ConfirmReveal, {
      roomId: roomState.roomId,
    });
  }

  function handleClaimChallenge() {
    if (!roomState || !canClaimChallenge) {
      return;
    }

    socketClient.emit(ClientToServerEvent.ClaimChallenge, {
      roomId: roomState.roomId,
    });
  }

  function handlePlaceChallenge() {
    if (!roomState || !canSelectChallengeSlot) {
      return;
    }

    socketClient.emit(ClientToServerEvent.PlaceChallenge, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleResolveChallengeWindow() {
    if (!roomState || !canResolveChallengeWindow) {
      return;
    }

    socketClient.emit(ClientToServerEvent.ResolveChallengeWindow, {
      roomId: roomState.roomId,
    });
  }

  function handleCloseRoom() {
    if (!roomState || roomState.hostId !== currentPlayerId) {
      return;
    }

    socketClient.emit(ClientToServerEvent.CloseRoom, {
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

    socketClient.emit(ClientToServerEvent.AwardTt, {
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

    socketClient.emit(ClientToServerEvent.SkipTrackWithTt, {
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

    socketClient.emit(ClientToServerEvent.BuyTimelineCardWithTt, {
      roomId: roomState.roomId,
    });
  }

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
    roomState?.status === "challenge" || canSelectTurnSlot
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
  const revealPrimaryText =
    roomState?.status === "reveal" && roomState.revealState
      ? roomState.revealState.wasCorrect
        ? roomState.revealState.revealType === "tt_buy"
          ? `${getPlayerName(roomState.revealState.playerId)} bought this card with TT.`
          : `${getPlayerName(roomState.revealState.playerId)} was correct.`
        : `${getPlayerName(roomState.revealState.playerId)} was wrong. Correct slot${roomState.revealState.validSlotIndexes.length > 1 ? "s were" : " was"} ${roomState.revealState.validSlotIndexes.join(
            ", ",
          )}.`
      : null;
  const revealSecondaryText =
    roomState?.status === "reveal" && roomState.revealState
      ? roomState.revealState.challengerPlayerId
        ? roomState.revealState.challengeWasSuccessful
          ? `${getPlayerName(revealChallenger?.id)} won Beat! and gained +${roomState.revealState.challengerTtChange} TT.`
          : `${getPlayerName(revealChallenger?.id)} lost Beat! and lost ${Math.abs(roomState.revealState.challengerTtChange)} TT.`
        : roomState.revealState.revealType === "tt_buy"
          ? "Beat was skipped for this TT buy."
          : "No Beat was used."
      : null;
  const revealOwnerText =
    roomState?.status === "reveal" && roomState.revealState
      ? roomState.revealState.awardedPlayerId
        ? `Card owner: ${getPlayerName(awardedPlayer?.id)}`
        : "Card owner: nobody"
      : null;
  const showOwnTimeline =
    Boolean(currentPlayerId) && currentPlayerId !== activePlayer?.id;
  const challengeMarkerTone =
    roomState?.status === "reveal" && roomState.revealState?.challengerPlayerId
      ? roomState.revealState.challengeWasSuccessful
        ? "success"
        : "failure"
      : "pending";
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
  const visiblePreviewCard = isViewingOwnTimeline ? null : activeTimelinePreviewCard;
  const visiblePreviewSlot = isViewingOwnTimeline ? null : activeTimelinePreviewSlot;
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
  const disabledTimelineSlots =
    !isViewingOwnTimeline && roomState?.status === "challenge" && canSelectChallengeSlot
      ? [roomState.challengeState?.originalSelectedSlotIndex ?? -1]
      : [];
  const visibleTimelineCardCount = visibleTimelineCards.length;
  const leadingPlayers = roomState?.players
    .slice()
    .sort((leftPlayer, rightPlayer) => {
      const rightScore = roomState.timelines[rightPlayer.id]?.length ?? 0;
      const leftScore = roomState.timelines[leftPlayer.id]?.length ?? 0;

      return rightScore - leftScore;
    })
    .slice(0, 3) ?? [];

  if (!roomState) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Loading game...</h1>
        </section>
      </main>
    );
  }

  const menuTabs = [
    {
      id: "players" as const,
      label: "Players",
      content: (
        <div className={styles.menuInfoSection}>
          <h3 className={styles.menuInfoTitle}>Players summary</h3>
          <div className={styles.menuPlayerList}>
            {roomState.players.map((player) => (
              <div className={styles.menuPlayerRow} key={player.id}>
                <div>
                  <strong className={styles.menuPlayerName}>
                    {player.id === currentPlayerId ? "You" : player.displayName}
                  </strong>
                  <p className={styles.menuPlayerMeta}>
                    {roomState.timelines[player.id]?.length ?? 0} cards
                    {roomState.settings.ttModeEnabled
                      ? ` · ${player.ttTokenCount} TT`
                      : ""}
                    {player.isHost ? " · Host" : ""}
                    {player.id === roomState.turn?.activePlayerId ? " · Turn" : ""}
                  </p>
                </div>
                {roomState.settings.ttModeEnabled &&
                roomState.hostId === currentPlayerId ? (
                  <button
                    className={styles.menuActionButton}
                    onClick={() => handleAwardTt(player.id)}
                    type="button"
                  >
                    +TT
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "view" as const,
      label: "View",
      content: (
        <p className={styles.menuPlaceholder}>
          Timeline visibility preferences now live inside the shared menu shell.
        </p>
      ),
    },
    {
      id: "settings" as const,
      label: "Settings",
      content: (
        <p className={styles.menuPlaceholder}>
          Theme and hidden-card preferences are available here while the final
          game shell is being built.
        </p>
      ),
    },
    ...(roomState.hostId === currentPlayerId
      ? [
          {
            id: "host" as const,
            label: "Host",
            content: (
              <div className={styles.menuInfoSection}>
                <h3 className={styles.menuInfoTitle}>Host room controls</h3>
                <p className={styles.menuPlaceholder}>
                  Destructive and contextual room controls will fully move here
                  in later batches.
                </p>
                <button
                  className={styles.menuDangerButton}
                  onClick={handleCloseRoom}
                  type="button"
                >
                  End room
                </button>
              </div>
            ),
          },
          {
            id: "dev" as const,
            label: "Dev",
            content: (
              <p className={styles.menuPlaceholder}>
                Developer-only current-card helpers will move into this tab as
                the main game surface gets cleaned up.
              </p>
            ),
          },
        ]
      : []),
  ];

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerChipRow}>
              {showRoomCodeChip ? (
                <span className={styles.headerChip}>Room {roomState.roomId}</span>
              ) : null}
              {showPhaseChip ? (
                <span className={styles.headerChip}>
                  {formatPhaseLabel(roomState.status)}
                </span>
              ) : null}
              {showTurnNumberChip ? (
                <span className={styles.headerChip}>
                  Turn {roomState.turn?.turnNumber ?? "-"}
                </span>
              ) : null}
            </div>
          </div>
          <div className={styles.headerAside}>
            <div className={styles.headerActionRow}>
              <div className={styles.statusBadge}>{statusBadgeText}</div>
              <button
                className={styles.headerUtilityButton}
                onClick={() =>
                  updateViewPreferences({
                    showMiniStandings: !showMiniStandings,
                  })
                }
                type="button"
              >
                {showMiniStandings ? "Hide leaders" : "Show leaders"}
              </button>
              <AppShellMenu
                subtitle="Grouped player, host, and developer controls now share one consistent menu shell."
                tabs={menuTabs}
                title="Game menu"
              />
            </div>
            {showTimelineHints ? (
              <p className={styles.statusCaption}>{statusDetailText}</p>
            ) : null}
          </div>
        </header>

        {showMiniStandings ? (
          <section className={styles.miniStandingsStrip}>
            {leadingPlayers.map((player, index) => (
              <article className={styles.miniStandingCard} key={player.id}>
                <span className={styles.miniStandingRank}>#{index + 1}</span>
                <strong className={styles.miniStandingName}>
                  {player.id === currentPlayerId ? "You" : player.displayName}
                </strong>
                <span className={styles.miniStandingMeta}>
                  {roomState.timelines[player.id]?.length ?? 0} cards
                  {roomState.settings.ttModeEnabled
                    ? ` · ${player.ttTokenCount} TT`
                    : ""}
                  {player.id === roomState.turn?.activePlayerId ? " · Turn" : ""}
                </span>
              </article>
            ))}
          </section>
        ) : null}

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        {canToggleTimelineView ? (
          <section className={styles.timelineSwitcherPanel}>
            <div className={styles.timelineSwitcherCopy}>
              {showTimelineHints ? (
                <p className={styles.timelineSwitcherText}>
                  Keep the active timeline in view to judge the current song, or
                  switch to your own timeline for a quick progress check.
                </p>
              ) : null}
            </div>
            <div className={styles.timelineViewSwitcher}>
              <button
                className={`${styles.viewToggleButton} ${
                  timelineView === "active" ? styles.viewToggleButtonActive : ""
                }`}
                onClick={() => setTimelineView("active")}
                type="button"
              >
                Active timeline
              </button>
              <button
                className={`${styles.viewToggleButton} ${
                  timelineView === "mine" ? styles.viewToggleButtonActive : ""
                }`}
                onClick={() => setTimelineView("mine")}
                type="button"
              >
                Your timeline
              </button>
            </div>
          </section>
        ) : null}

        <TimelinePanel
          cardCount={visibleTimelineCardCount}
          challengeMarkerTone={challengeMarkerTone}
          challengerChosenSlotIndex={visibleChallengeChosenSlot}
          disabledSlotIndexes={disabledTimelineSlots}
          hiddenCardMode={hiddenCardMode}
          hint={visibleTimelineHint}
          onSelectSlot={setSelectedSlotIndex}
          originalChosenSlotIndex={visibleOriginalChosenSlot}
          previewCard={visiblePreviewCard}
          previewSlotIndex={visiblePreviewSlot}
          selectable={!isViewingOwnTimeline && canSelectSlot}
          selectedSlotIndex={selectedSlotIndex}
          showDevAlbumInfo={isHost && showDevAlbumInfo}
          showDevCardInfo={isHost && showDevCardInfo}
          showDevGenreInfo={isHost && showDevGenreInfo}
          showHint={showTimelineHints}
          timelineCards={visibleTimelineCards}
          title={visibleTimelineTitle}
        />

        {roomState.status === "turn" ? (
          <>
            {roomState.settings.ttModeEnabled ? (
              <section className={styles.actionRail}>
                <div className={styles.actionRailHeader}>
                  <div>
                    <h3 className={styles.actionRailTitle}>Turn actions</h3>
                    {showTimelineHints ? (
                      <p className={styles.actionRailText}>
                        Optional TT actions for the active player.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className={styles.turnActionButtons}>
                  <button
                    className={styles.secondaryButton}
                    disabled={
                      !isCurrentPlayerTurn ||
                      hasUsedSkipTrackWithTt ||
                      (currentPlayer?.ttTokenCount ?? 0) < SKIP_TRACK_TT_COST
                    }
                    onClick={handleSkipTrackWithTt}
                    type="button"
                  >
                    {hasUsedSkipTrackWithTt
                      ? "Skip used"
                      : `Skip Track (${SKIP_TRACK_TT_COST} TT)`}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={
                      !isCurrentPlayerTurn ||
                      (currentPlayer?.ttTokenCount ?? 0) < BUY_TIMELINE_CARD_TT_COST
                    }
                    onClick={handleBuyTimelineCardWithTt}
                    type="button"
                  >
                    Buy Card ({BUY_TIMELINE_CARD_TT_COST} TT)
                  </button>
                </div>
              </section>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={!isCurrentPlayerTurn || !roomState.currentTrackCard}
              onClick={handlePlaceCard}
              type="button"
            >
              {isCurrentPlayerTurn
                ? `Confirm Placement In Slot ${selectedSlotIndex}`
                : "Waiting for the active player"}
            </button>
          </>
        ) : null}

        {roomState.status === "challenge" && roomState.challengeState ? (
          <section className={styles.actionRail}>
            <div className={styles.actionRailHeader}>
              <div>
                <h3 className={styles.actionRailTitle}>{challengeActionTitle}</h3>
                {challengeActionBody ? (
                  <p className={styles.actionRailText}>{challengeActionBody}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.challengeMetaRow}>
              <span className={styles.challengeChip}>
                Chosen slot: {roomState.challengeState.originalSelectedSlotIndex}
              </span>
              {roomState.settings.ttModeEnabled ? (
                <span className={styles.challengeChip}>
                  Your TT: {currentPlayer?.ttTokenCount ?? 0}
                </span>
              ) : null}
              {challengeCountdownLabel ? (
                <span className={styles.challengeChip}>
                  {challengeCountdownLabel}
                </span>
              ) : roomState.challengeState.phase === "claimed" ? (
                <span className={styles.challengeChip}>
                  Beat! was claimed. Waiting for the placement.
                </span>
              ) : (
                <span className={styles.challengeChip}>
                  Host resolves this window manually
                </span>
              )}
            </div>

            {roomState.challengeState.phase === "open" ? (
              <>
                <button
                  className={styles.primaryButton}
                  disabled={!canClaimChallenge}
                  onClick={handleClaimChallenge}
                  type="button"
                >
                  {canClaimChallenge
                    ? "Beat!"
                    : isCurrentPlayerTurn
                      ? "You cannot Beat! your own turn"
                      : (currentPlayer?.ttTokenCount ?? 0) < 1
                        ? "You need at least 1 TT"
                        : "Beat! is not available for you now"}
                </button>

                {canResolveChallengeWindow ? (
                  <button
                    className={styles.secondaryButton}
                    onClick={handleResolveChallengeWindow}
                    type="button"
                  >
                    Resolve Without Beat!
                  </button>
                ) : null}
              </>
            ) : (
                <button
                  className={styles.primaryButton}
                  disabled={!canSelectChallengeSlot}
                  onClick={handlePlaceChallenge}
                  type="button"
                >
                  {canSelectChallengeSlot
                    ? `Confirm Beat ${selectedSlotIndex}`
                    : `${getPlayerName(challengeOwner?.id)} is choosing`}
                </button>
              )}
          </section>
        ) : null}

        {roomState.status === "reveal" && roomState.revealState ? (
          <section className={styles.revealPanel}>
            <div className={styles.revealHeaderCompact}>
              <div>
                <h2 className={styles.cardTitle}>
                  {roomState.revealState.placedCard.title}
                </h2>
                <p className={styles.cardMeta}>
                  {roomState.revealState.placedCard.artist} ·{" "}
                  {roomState.revealState.placedCard.revealedYear}
                </p>
              </div>
              <span className={styles.revealBadge}>Reveal</span>
            </div>

            <div className={styles.revealInfoGrid}>
              {revealPrimaryText ? (
                <p className={styles.revealResult}>{revealPrimaryText}</p>
              ) : null}
              {revealSecondaryText ? (
                <p className={styles.challengeOutcome}>{revealSecondaryText}</p>
              ) : null}
              {revealOwnerText ? (
                <p className={styles.challengeOutcome}>{revealOwnerText}</p>
              ) : null}
            </div>

            <button
              className={styles.primaryButton}
              disabled={!canConfirmReveal}
              onClick={handleConfirmReveal}
              type="button"
            >
              {canConfirmReveal
                ? "Confirm Reveal"
                : "Waiting for reveal confirmation"}
            </button>
          </section>
        ) : null}

        {roomState.status === "finished" ? (
          <section className={styles.revealPanel}>
            {showHelperLabels ? (
              <p className={styles.sectionLabel}>Game Over</p>
            ) : null}
            <h2 className={styles.cardTitle}>
              {getPlayerName(roomState.winnerPlayerId)} wins!
            </h2>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function TimelinePanel({
  title,
  hint,
  showHint,
  cardCount,
  timelineCards,
  previewCard,
  previewSlotIndex,
  selectable,
  selectedSlotIndex,
  onSelectSlot,
  originalChosenSlotIndex,
  challengerChosenSlotIndex,
  challengeMarkerTone = "pending",
  disabledSlotIndexes = [],
  hiddenCardMode,
  showDevCardInfo,
  showDevAlbumInfo,
  showDevGenreInfo,
}: TimelinePanelProps) {
  return (
    <section className={styles.timelinePanel}>
      <div className={styles.timelineHeader}>
        <div className={styles.timelineHeaderCopy}>
          <h2 className={styles.timelineHeading}>{title}</h2>
        </div>
        <span className={styles.timelineCount}>
          {cardCount} card{cardCount === 1 ? "" : "s"}
        </span>
      </div>
      {showHint ? <p className={styles.timelineHint}>{hint}</p> : null}
      <div className={styles.timelineRow}>
        {Array.from({ length: timelineCards.length + 1 }).map((_, slotIndex) => {
          const isSelected = selectable && selectedSlotIndex === slotIndex;
          const isOriginalSlot = originalChosenSlotIndex === slotIndex;
          const isChallengeSlot = challengerChosenSlotIndex === slotIndex;
          const showPreviewCard = previewCard && previewSlotIndex === slotIndex;
          const isDisabledSlot = disabledSlotIndexes.includes(slotIndex);

          return (
            <div className={styles.slotGroup} key={`slot-${slotIndex.toString()}`}>
              <div className={styles.slotArea}>
                <button
                  className={`${styles.slotButton} ${
                    isSelected ? styles.slotButtonSelected : ""
                  } ${isOriginalSlot ? styles.slotButtonOriginal : ""} ${
                    isChallengeSlot
                      ? challengeMarkerTone === "failure"
                        ? styles.slotButtonChallengeFailure
                        : styles.slotButtonChallenge
                      : ""
                  }`}
                  disabled={!selectable || isDisabledSlot}
                  onClick={() => onSelectSlot(slotIndex)}
                  type="button"
                >
                  Slot {slotIndex}
                </button>

                {showPreviewCard ? (
                  <article
                    className={`${styles.previewCard} ${
                      hiddenCardMode === "gradient"
                        ? styles.previewCardGradient
                        : styles.previewCardArtwork
                    } ${isOriginalSlot ? styles.previewCardCurrentPick : ""} ${
                      isChallengeSlot
                        ? challengeMarkerTone === "failure"
                          ? styles.previewCardChallengeFailure
                          : styles.previewCardChallenge
                        : ""
                    }`}
                  >
                    <div className={styles.previewCardFace}>
                      {showDevCardInfo ? (
                        <>
                          <p className={styles.previewLabel}>Developer preview</p>
                          <h3 className={styles.previewCardTitle}>
                            {previewCard.title}
                          </h3>
                          <p className={styles.previewCardSubtitle}>
                            {previewCard.artist}
                            {showDevAlbumInfo && "albumTitle" in previewCard
                              ? ` · ${previewCard.albumTitle}`
                              : ""}
                          </p>
                          {showDevGenreInfo &&
                          "genre" in previewCard &&
                          previewCard.genre ? (
                            <p className={styles.previewCardMetaPill}>
                              {previewCard.genre}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className={styles.previewLabel}>Current card</p>
                          <h3 className={styles.previewCardTitle}>TuneTrack</h3>
                          <p className={styles.previewCardSubtitle}>
                            Hidden until reveal
                          </p>
                        </>
                      )}
                    </div>
                  </article>
                ) : null}
              </div>

              {slotIndex < timelineCards.length ? (
                <article
                  className={`${styles.timelineCard} ${
                    isOriginalSlot ? styles.timelineCardCurrentPick : ""
                  } ${
                    isChallengeSlot
                      ? challengeMarkerTone === "failure"
                        ? styles.timelineCardChallengeFailure
                        : styles.timelineCardChallenge
                      : ""
                  }`}
                >
                  <h3 className={styles.timelineTitle}>
                    {timelineCards[slotIndex]?.title}
                  </h3>
                  <p className={styles.cardMeta}>{timelineCards[slotIndex]?.artist}</p>
                  <strong className={styles.yearText}>
                    {timelineCards[slotIndex]?.revealedYear}
                  </strong>
                </article>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
