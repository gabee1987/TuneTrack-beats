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
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  type DraggableAttributes,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  defaultAnimateLayoutChanges,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import type {
  HiddenCardMode,
  ThemeId,
} from "../../features/preferences/uiPreferences";
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
  canToggleView?: boolean;
  timelineView?: "active" | "mine";
  timelineCards: TimelineCardPublic[];
  onToggleTimelineView?: (view: "active" | "mine") => void;
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
  showCorrectionPreview?: boolean;
  showCorrectPlacementPreview?: boolean;
  theme: ThemeId;
}

// Drag feel notes:
// keep these grouped here so later tuning is one quick edit pass.
const DRAG_ACTIVATION_DISTANCE_PX = 4;
const DRAG_EDGE_SCROLL_ZONE_PX = 120;
const DRAG_EDGE_SCROLL_MAX_STEP_PX = 20;
const TIMELINE_REORDER_DURATION_MS = 860;
const TIMELINE_REORDER_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
// If the cards beneath the drag still feel too twitchy, increase this a bit.
const TIMELINE_REORDER_THROTTLE_MS = 180;

function animateTimelineLayoutChanges(
  args: Parameters<typeof defaultAnimateLayoutChanges>[0],
) {
  return defaultAnimateLayoutChanges(args);
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
  const [locallyPlacedCard, setLocallyPlacedCard] = useState<TrackCardPublic | null>(
    null,
  );
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
  const theme = useUiPreferencesStore((state) => state.theme);

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

  useEffect(() => {
    if (roomState?.status === "turn") {
      setLocallyPlacedCard(null);
    }
  }, [roomState?.status, roomState?.turn?.turnNumber]);

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

    setLocallyPlacedCard(roomState.currentTrackCard ?? null);
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
    roomState?.status === "challenge"
      ? roomState?.currentTrackCard ?? locallyPlacedCard
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
  const canUseSkipTrack =
    roomState?.status === "turn" &&
    roomState.settings.ttModeEnabled &&
    isCurrentPlayerTurn &&
    !hasUsedSkipTrackWithTt &&
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
              {showMiniStandings ? (
                <div className={styles.headerLeadersStrip}>
                  {leadingPlayers.map((player, index) => (
                    <article className={styles.headerLeaderChip} key={player.id}>
                      <span className={styles.headerLeaderRank}>#{index + 1}</span>
                      <strong className={styles.headerLeaderName}>
                        {player.id === currentPlayerId ? "You" : player.displayName}
                      </strong>
                      <span className={styles.headerLeaderMeta}>
                        {roomState.timelines[player.id]?.length ?? 0}
                        {roomState.settings.ttModeEnabled
                          ? ` · ${player.ttTokenCount} TT`
                          : ""}
                      </span>
                    </article>
                  ))}
                </div>
              ) : null}
              <button
                aria-label={showMiniStandings ? "Hide leaderboard" : "Show leaderboard"}
                className={styles.headerIconButton}
                onClick={() =>
                  updateViewPreferences({
                    showMiniStandings: !showMiniStandings,
                  })
                }
                title={showMiniStandings ? "Hide leaderboard" : "Show leaderboard"}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className={styles.headerIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 20H9V11H5V20Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M10 20H14V4H10V20Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M15 20H19V8H15V20Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M4 20H20"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
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

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <TimelinePanel
          cardCount={visibleTimelineCardCount}
          canToggleView={canToggleTimelineView}
          challengeMarkerTone={challengeMarkerTone}
          challengerChosenSlotIndex={visibleChallengeChosenSlot}
          disabledSlotIndexes={disabledTimelineSlots}
          hiddenCardMode={hiddenCardMode}
          hint={visibleTimelineHint}
          onToggleTimelineView={setTimelineView}
          onSelectSlot={setSelectedSlotIndex}
          originalChosenSlotIndex={visibleOriginalChosenSlot}
          previewCard={visiblePreviewCard}
          previewSlotIndex={visiblePreviewSlot}
          selectable={!isViewingOwnTimeline && canSelectSlot}
          selectedSlotIndex={selectedSlotIndex}
          showDevAlbumInfo={isHost && showDevAlbumInfo}
          showDevCardInfo={isHost && showDevCardInfo}
          showDevGenreInfo={isHost && showDevGenreInfo}
          showCorrectionPreview={Boolean(showCorrectionPreview)}
          showCorrectPlacementPreview={Boolean(showCorrectPlacementPreview)}
          showHint={showTimelineHints}
          theme={theme}
          timelineView={timelineView}
          timelineCards={visibleTimelineCards}
          title={visibleTimelineTitle}
        />

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
                {canClaimChallenge || canResolveChallengeWindow ? (
                  <div className={styles.floatingActionDock}>
                    {canClaimChallenge ? (
                      <button
                        className={styles.floatingPrimaryButton}
                        onClick={handleClaimChallenge}
                        type="button"
                      >
                        Beat!
                      </button>
                    ) : null}
                    {canResolveChallengeWindow ? (
                      <button
                        className={styles.floatingSecondaryButton}
                        onClick={handleResolveChallengeWindow}
                        type="button"
                      >
                        Resolve
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
                canConfirmBeatPlacement ? (
                  <div className={styles.floatingActionDock}>
                    <button
                      className={styles.floatingPrimaryButton}
                      onClick={handlePlaceChallenge}
                      type="button"
                    >
                      Confirm Beat
                    </button>
                  </div>
                ) : null
              )}
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

        {roomState.status === "reveal" && canConfirmReveal ? (
          <div className={styles.floatingActionDock}>
            <button
              className={styles.floatingPrimaryButton}
              onClick={handleConfirmReveal}
              type="button"
            >
              Confirm Reveal
            </button>
          </div>
        ) : null}

        {roomState.status === "turn" &&
        (canUseSkipTrack || canUseBuyCard || canConfirmTurnPlacement) ? (
          <div className={styles.floatingActionDock}>
            {canUseSkipTrack ? (
              <button
                className={styles.floatingSecondaryButton}
                onClick={handleSkipTrackWithTt}
                type="button"
              >
                Skip
              </button>
            ) : null}
            {canUseBuyCard ? (
              <button
                className={styles.floatingSecondaryButton}
                onClick={handleBuyTimelineCardWithTt}
                type="button"
              >
                Buy
              </button>
            ) : null}
            {canConfirmTurnPlacement ? (
              <button
                className={styles.floatingPrimaryButton}
                onClick={handlePlaceCard}
                type="button"
              >
                Confirm
              </button>
            ) : null}
          </div>
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
  canToggleView = false,
  timelineView = "active",
  timelineCards,
  onToggleTimelineView,
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
  showCorrectionPreview = false,
  showCorrectPlacementPreview = false,
  theme,
}: TimelinePanelProps) {
  const [isDraggingPreviewCard, setIsDraggingPreviewCard] = useState(false);
  const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);
  const timelineRowRef = useRef<HTMLDivElement | null>(null);
  const lastPreviewReorderAtRef = useRef(0);
  const previewItemId = "timeline-preview-card";
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE_PX,
      },
    }),
  );
  const previewIndex = previewCard
    ? Math.max(
        0,
        Math.min(previewSlotIndex ?? selectedSlotIndex, timelineCards.length),
      )
    : null;
  const baseOrderedItemIds = useMemo(() => {
    const itemIds = timelineCards.map((card, index) => `timeline-card-${card.id}-${index}`);

    if (previewCard && previewIndex !== null) {
      itemIds.splice(previewIndex, 0, previewItemId);
    }

    return itemIds;
  }, [previewCard, previewIndex, timelineCards]);
  const [orderedItemIds, setOrderedItemIds] = useState<string[]>(baseOrderedItemIds);

  useEffect(() => {
    if (!isDraggingPreviewCard) {
      setOrderedItemIds(baseOrderedItemIds);
    }
  }, [baseOrderedItemIds, isDraggingPreviewCard]);

  useEffect(() => {
    if (!timelineRowRef.current) {
      return;
    }

    const rowElement = timelineRowRef.current as HTMLDivElement;

    function updateOverflowState() {
      setHasTimelineOverflow(
        rowElement.scrollWidth - rowElement.clientWidth > 4,
      );
    }

    updateOverflowState();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflowState();
    });

    resizeObserver.observe(rowElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [orderedItemIds]);

  const timelineItemMap = useMemo(() => {
    const map = new Map<
      string,
      | {
          type: "preview";
          card: TrackCardPublic | TimelineCardPublic;
        }
      | {
          type: "timeline";
          card: TimelineCardPublic;
        }
    >();

    timelineCards.forEach((card, index) => {
      map.set(`timeline-card-${card.id}-${index}`, {
        type: "timeline",
        card,
      });
    });

    if (previewCard) {
      map.set(previewItemId, {
        type: "preview",
        card: previewCard,
      });
    }

    return map;
  }, [previewCard, timelineCards]);

  function handleDragStart(_: DragStartEvent) {
    lastPreviewReorderAtRef.current = 0;
    setIsDraggingPreviewCard(true);
  }

  function handleDragMove(event: DragMoveEvent) {
    const container = timelineRowRef.current;
    const translatedRect = event.active.rect.current.translated;

    if (!container || !translatedRect) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const scrollEdgeSize = DRAG_EDGE_SCROLL_ZONE_PX;
    const maxScrollStep = DRAG_EDGE_SCROLL_MAX_STEP_PX;
    let scrollLeft = 0;

    if (translatedRect.right > containerRect.right - scrollEdgeSize) {
      scrollLeft = Math.min(
        maxScrollStep,
        (translatedRect.right - (containerRect.right - scrollEdgeSize)) / 5,
      );
    } else if (translatedRect.left < containerRect.left + scrollEdgeSize) {
      scrollLeft = -Math.min(
        maxScrollStep,
        ((containerRect.left + scrollEdgeSize) - translatedRect.left) / 5,
      );
    }

    if (scrollLeft !== 0) {
      container.scrollBy({
        left: scrollLeft,
        behavior: "auto",
      });
    }

    syncPreviewIndexFromActiveRect(translatedRect);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.active.id !== previewItemId) {
      setIsDraggingPreviewCard(false);
      return;
    }

    const slotIndex = orderedItemIds.indexOf(previewItemId);

    if (slotIndex !== null) {
      onSelectSlot(slotIndex);
    }

    setIsDraggingPreviewCard(false);
  }

  function handleDragCancel() {
    lastPreviewReorderAtRef.current = 0;
    setIsDraggingPreviewCard(false);
  }

  function syncPreviewIndexFromActiveRect(
    translatedRect: DragMoveEvent["active"]["rect"]["current"]["translated"] | null,
  ) {
    if (!translatedRect) {
      return;
    }

    const timelineRow = timelineRowRef.current;

    if (!timelineRow) {
      return;
    }

    const activeCenterX = translatedRect.left + translatedRect.width / 2;
    const renderedTimelineCards = Array.from(
      timelineRow.querySelectorAll<HTMLElement>("[data-timeline-card='true']"),
    );

    let nextPreviewIndex = 0;

    for (const timelineCard of renderedTimelineCards) {
      const cardRect = timelineCard.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;

      if (activeCenterX > cardCenterX) {
        nextPreviewIndex += 1;
      } else {
        break;
      }
    }

    if (orderedItemIds.indexOf(previewItemId) === nextPreviewIndex) {
      return;
    }

    const now = performance.now();

    if (now - lastPreviewReorderAtRef.current < TIMELINE_REORDER_THROTTLE_MS) {
      return;
    }

    const baseTimelineIds = timelineCards.map(
      (card, index) => `timeline-card-${card.id}-${index}`,
    );
    const nextOrder = [...baseTimelineIds];

    nextOrder.splice(nextPreviewIndex, 0, previewItemId);

    lastPreviewReorderAtRef.current = now;
    setOrderedItemIds(nextOrder);
    onSelectSlot(nextPreviewIndex);
  }

  return (
    <section className={styles.timelinePanel}>
      <div className={styles.timelineHeader}>
        <div className={styles.timelineHeaderCopy}>
          <h2 className={styles.timelineHeading}>{title}</h2>
          <span className={styles.timelineCountSeparator}>/</span>
          <span className={styles.timelineCount}>
            {cardCount} card{cardCount === 1 ? "" : "s"}
          </span>
        </div>
        {canToggleView && onToggleTimelineView ? (
          <div className={styles.timelineViewSwitcherCompact}>
            <button
              className={`${styles.timelineViewCompactButton} ${
                timelineView === "active"
                  ? styles.timelineViewCompactButtonActive
                  : ""
              }`}
              data-active={timelineView === "active"}
              onClick={() => onToggleTimelineView("active")}
              type="button"
            >
              Active
            </button>
            <button
              className={`${styles.timelineViewCompactButton} ${
                timelineView === "mine"
                  ? styles.timelineViewCompactButtonActive
                  : ""
              }`}
              data-active={timelineView === "mine"}
              onClick={() => onToggleTimelineView("mine")}
              type="button"
            >
              Mine
            </button>
          </div>
        ) : null}
      </div>
      {showHint ? <p className={styles.timelineHint}>{hint}</p> : null}
      <DndContext
        autoScroll
        collisionDetection={closestCenter}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div
          className={`${styles.timelineRow} ${
            hasTimelineOverflow ? styles.timelineRowOverflowing : ""
          }`}
          ref={timelineRowRef}
        >
          <SortableContext
            items={orderedItemIds}
            strategy={horizontalListSortingStrategy}
          >
            {orderedItemIds.map((itemId) => {
              const item = timelineItemMap.get(itemId);

              if (!item) {
                return null;
              }

              const itemIndex = orderedItemIds.indexOf(itemId);
              const isOriginalSlot =
                originalChosenSlotIndex !== null &&
                item.type === "preview" &&
                itemIndex === originalChosenSlotIndex;
              const isChallengeSlot =
                challengerChosenSlotIndex !== null &&
                item.type === "preview" &&
                itemIndex === challengerChosenSlotIndex;
              const previewDisabled =
                item.type === "preview" &&
                disabledSlotIndexes.includes(itemIndex);

              return (
                <TimelineSortableItem
                  card={item.card}
                  challengeMarkerTone={challengeMarkerTone}
                  hiddenCardMode={hiddenCardMode}
                  id={itemId}
                  isChallengeSlot={isChallengeSlot}
                  isDraggingPreviewCard={isDraggingPreviewCard}
                  isOriginalSlot={isOriginalSlot}
                  isPreview={item.type === "preview"}
                  isPreviewDisabled={previewDisabled}
                  key={itemId}
                  selectable={selectable}
                  showCorrectPlacementPreview={showCorrectPlacementPreview}
                  showCorrectionPreview={showCorrectionPreview}
                  showDevAlbumInfo={showDevAlbumInfo}
                  showDevCardInfo={showDevCardInfo}
                  showDevGenreInfo={showDevGenreInfo}
                  theme={theme}
                />
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={null}>
          {isDraggingPreviewCard && previewCard ? (
            <PreviewCard
              hiddenCardMode={hiddenCardMode}
              isChallengeSlot={false}
              isGhosted={false}
              isOriginalSlot={false}
              previewCard={previewCard}
              selectable={false}
              showDevAlbumInfo={showDevAlbumInfo}
              showDevCardInfo={showDevCardInfo}
              showDevGenreInfo={showDevGenreInfo}
              showRevealedContent={showCorrectionPreview}
              theme={theme}
              tone="pending"
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

interface TimelineSortableItemProps {
  card: TrackCardPublic | TimelineCardPublic;
  challengeMarkerTone: "pending" | "success" | "failure";
  isChallengeSlot: boolean;
  isDraggingPreviewCard: boolean;
  isOriginalSlot: boolean;
  isPreview: boolean;
  isPreviewDisabled: boolean;
  hiddenCardMode: HiddenCardMode;
  id: string;
  selectable: boolean;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  theme: ThemeId;
}

function TimelineSortableItem({
  card,
  challengeMarkerTone,
  isChallengeSlot,
  isDraggingPreviewCard,
  isOriginalSlot,
  isPreview,
  isPreviewDisabled,
  hiddenCardMode,
  id,
  selectable,
  showCorrectPlacementPreview = false,
  showCorrectionPreview = false,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevGenreInfo,
  theme,
}: TimelineSortableItemProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    animateLayoutChanges: animateTimelineLayoutChanges,
    disabled: isPreview ? isPreviewDisabled : false,
    transition: {
      duration: TIMELINE_REORDER_DURATION_MS,
      easing: TIMELINE_REORDER_EASING,
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ["--card-gradient" as string]: getCardGradient(theme, id),
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.timelineItem} ${
        isPreview ? styles.timelineItemPreview : ""
      } ${isDragging && isPreview ? styles.timelineItemPreviewDragging : ""} ${
        isDraggingPreviewCard && isPreview ? styles.timelineItemPreviewGhost : ""
      }`}
      style={style}
    >
      {isPreview ? (
        <PreviewCard
          attributes={selectable ? attributes : undefined}
          hiddenCardMode={hiddenCardMode}
          isChallengeSlot={isChallengeSlot}
          isCorrectionPreview={showCorrectionPreview}
          isGhosted={isDragging}
          isCorrectPlacement={showCorrectPlacementPreview}
          isOriginalSlot={isOriginalSlot}
          listeners={selectable ? listeners : undefined}
          onPointerDown={
            selectable ? () => undefined : undefined
          }
          previewCard={card}
          selectable={selectable}
          showDevAlbumInfo={showDevAlbumInfo}
          showDevCardInfo={showDevCardInfo}
          showDevGenreInfo={showDevGenreInfo}
          showRevealedContent={showCorrectionPreview}
          theme={theme}
          tone={challengeMarkerTone}
        />
      ) : (
          <article
            data-timeline-card="true"
            className={`${styles.timelineCard} ${
            isOriginalSlot
              ? showCorrectPlacementPreview
                ? styles.timelineCardResolvedCorrect
                : styles.timelineCardCurrentPick
              : ""
          } ${
            isChallengeSlot
              ? challengeMarkerTone === "failure"
                ? styles.timelineCardChallengeFailure
                : styles.timelineCardChallenge
              : ""
          }`}
        >
          <p className={styles.timelineArtist}>{card.artist}</p>
          <div className={styles.timelineCardCenter}>
            <strong className={styles.yearText}>
              {"revealedYear" in card ? card.revealedYear : ""}
            </strong>
          </div>
          <div className={styles.timelineCardBottom}>
            <h3 className={styles.timelineTitle}>{card.title}</h3>
          </div>
        </article>
      )}
    </div>
  );
}

interface PreviewCardProps {
  attributes?: DraggableAttributes | undefined;
  hiddenCardMode: HiddenCardMode;
  isChallengeSlot: boolean;
  isCorrectPlacement?: boolean;
  isCorrectionPreview?: boolean;
  isGhosted: boolean;
  isOverlay?: boolean;
  isOriginalSlot: boolean;
  listeners?: Record<string, unknown> | undefined;
  onPointerDown?: (() => void) | undefined;
  previewCard: TrackCardPublic | TimelineCardPublic;
  selectable: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showRevealedContent?: boolean;
  theme: ThemeId;
  tone: "pending" | "success" | "failure";
  revealedYear?: number | null;
}

const PreviewCard = forwardRef<HTMLElement, PreviewCardProps>(function PreviewCard({
  attributes,
  hiddenCardMode,
  isChallengeSlot,
  isCorrectPlacement = false,
  isCorrectionPreview = false,
  isGhosted,
  isOverlay = false,
  isOriginalSlot,
  listeners,
  onPointerDown,
  previewCard,
  selectable,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevGenreInfo,
  showRevealedContent = false,
  theme,
  tone,
  revealedYear,
}: PreviewCardProps, ref) {
  const cardToneClass = isChallengeSlot
    ? tone === "failure"
      ? styles.previewCardChallengeFailure
      : styles.previewCardChallenge
    : isCorrectPlacement
      ? styles.previewCardResolvedCorrect
    : isCorrectionPreview
      ? styles.previewCardCorrection
    : isOriginalSlot
      ? styles.previewCardCurrentPick
      : "";

  return (
    <article
      ref={ref}
      className={`${styles.previewCard} ${
        hiddenCardMode === "gradient"
          ? styles.previewCardGradient
          : styles.previewCardArtwork
      } ${cardToneClass} ${selectable ? styles.previewCardDraggable : ""} ${
        isGhosted ? styles.previewCardGhost : ""
      } ${isOverlay ? styles.previewCardOverlay : ""} ${
        showRevealedContent ? styles.previewCardRevealed : ""
      } ${isCorrectionPreview ? styles.previewCardCorrectionSurface : ""}`}
      onPointerDown={onPointerDown}
      style={
        {
          ["--card-gradient" as string]: getCardGradient(
            theme,
            `${previewCard.id}-preview`,
            isOverlay ? "overlay" : "preview",
          ),
        } as CSSProperties
      }
      {...attributes}
      {...listeners}
    >
      <div className={styles.previewCardFace}>
        {showDevCardInfo || showRevealedContent ? (
          <>
            <p className={styles.previewCardArtist}>{previewCard.artist}</p>
            <div className={styles.previewCardCenter}>
              <strong className={styles.previewCardYear}>
                {revealedYear !== undefined && revealedYear !== null
                  ? String(revealedYear)
                  : "releaseYear" in previewCard
                    ? String(previewCard.releaseYear)
                    : ""}
              </strong>
              {showDevGenreInfo &&
              "genre" in previewCard &&
              previewCard.genre ? (
                <p className={styles.previewCardMetaPill}>
                  {String(previewCard.genre)}
                </p>
              ) : null}
            </div>
            <div className={styles.previewCardBottom}>
              {showDevAlbumInfo && "albumTitle" in previewCard ? (
                <p className={styles.previewCardAlbum}>
                  {String(previewCard.albumTitle)}
                </p>
              ) : null}
              <h3 className={styles.previewCardTitle}>{previewCard.title}</h3>
            </div>
          </>
        ) : (
          <>
            <p className={styles.previewCardArtist}>TuneTrack</p>
            <div className={styles.previewCardCenter}>
              <strong className={styles.previewCardYear}>TT</strong>
            </div>
            <div className={styles.previewCardBottom}>
              <h3 className={styles.previewCardTitle}>Hidden Until Reveal</h3>
            </div>
          </>
        )}
      </div>
    </article>
  );
});

function getCardGradient(
  theme: ThemeId,
  seed: string,
  variant: "default" | "preview" | "overlay" = "default",
): string {
  const darkGradients = [
    "linear-gradient(142deg, rgba(88, 105, 245, 0.92) 0%, rgba(62, 199, 192, 0.78) 100%)",
    "linear-gradient(227deg, rgba(130, 92, 235, 0.92) 0%, rgba(234, 99, 171, 0.76) 100%)",
    "linear-gradient(116deg, rgba(58, 160, 196, 0.9) 0%, rgba(99, 110, 240, 0.78) 100%)",
    "linear-gradient(201deg, rgba(240, 142, 88, 0.88) 0%, rgba(176, 103, 227, 0.72) 100%)",
    "linear-gradient(132deg, rgba(76, 177, 128, 0.88) 0%, rgba(70, 138, 216, 0.74) 100%)",
    "linear-gradient(238deg, rgba(226, 101, 152, 0.84) 0%, rgba(235, 166, 88, 0.72) 100%)",
    "linear-gradient(154deg, rgba(92, 126, 247, 0.9) 0%, rgba(126, 96, 214, 0.76) 100%)",
    "linear-gradient(213deg, rgba(67, 171, 161, 0.86) 0%, rgba(167, 186, 90, 0.72) 100%)",
  ];
  const lightGradients = [
    "linear-gradient(142deg, rgba(163, 187, 255, 0.96) 0%, rgba(147, 232, 216, 0.93) 100%)",
    "linear-gradient(227deg, rgba(201, 173, 255, 0.96) 0%, rgba(255, 176, 214, 0.92) 100%)",
    "linear-gradient(116deg, rgba(154, 216, 240, 0.96) 0%, rgba(170, 185, 255, 0.92) 100%)",
    "linear-gradient(201deg, rgba(255, 201, 157, 0.95) 0%, rgba(208, 176, 255, 0.91) 100%)",
    "linear-gradient(132deg, rgba(164, 226, 182, 0.95) 0%, rgba(160, 209, 244, 0.91) 100%)",
    "linear-gradient(238deg, rgba(248, 177, 202, 0.95) 0%, rgba(247, 213, 149, 0.91) 100%)",
    "linear-gradient(154deg, rgba(168, 190, 255, 0.96) 0%, rgba(195, 177, 244, 0.92) 100%)",
    "linear-gradient(213deg, rgba(160, 225, 216, 0.95) 0%, rgba(212, 223, 137, 0.91) 100%)",
  ];
  const gradients = theme === "light" ? lightGradients : darkGradients;
  const seedValue = Array.from(seed).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );
  const gradient = gradients[seedValue % gradients.length] ?? gradients[0] ?? "";

  if (variant === "overlay") {
    return `${gradient}, linear-gradient(160deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)`;
  }

  if (variant === "preview") {
    return `${gradient}, radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.12), transparent 28%)`;
  }

  return gradient;
}
