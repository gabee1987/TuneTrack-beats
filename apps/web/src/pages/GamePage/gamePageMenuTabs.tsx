import {
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicPlayerState,
  type PublicRoomState,
} from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import {
  MotionDialogPortal,
  createMeasuredDisclosureMotion,
  createMenuTokenAdjustFlyoutPopTransition,
  createMenuTokenAdjustFlyoutPopVariants,
  createMenuTokenAdjustFlyoutTransition,
  createMenuTokenAdjustFlyoutVariants,
  createStandardTransition,
} from "../../features/motion";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import type { Translate } from "../../features/i18n";
import { Badge } from "../../features/ui/Badge";
import { CardCountAmount } from "../../features/ui/CardCountAmount";
import { TtTokenAmount, TtTokenIcon } from "../../features/ui/TtToken";
import type { HostPlaybackState } from "./hooks/useHostPlayback";
import type { GameHistoryEntry } from "./hooks/useGameHistory";
import styles from "./GamePage.module.css";

interface CreateGameMenuTabsOptions {
  currentPlayerId: string | null;
  historyEntries: GameHistoryEntry[];
  roomState: PublicRoomState;
  onAwardTt: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onRemoveTt: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  playback?: HostPlaybackState;
  t: Translate;
}

type TokenFlyAnimation = "add" | "remove" | null;
interface TokenFlyState {
  direction: Exclude<TokenFlyAnimation, null>;
  originX: number;
  originY: number;
  key: number;
}

interface TokenAdjustButtonsProps {
  currentTokenCount: number;
  onAwardTt: () => void;
  onRemoveTt: () => void;
}

function TokenAdjustButtons({ currentTokenCount, onAwardTt, onRemoveTt }: TokenAdjustButtonsProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const animationKeyRef = useRef(0);
  const tokenActionsRef = useRef<HTMLDivElement | null>(null);
  const addButtonContentRef = useRef<HTMLSpanElement | null>(null);
  const removeButtonContentRef = useRef<HTMLSpanElement | null>(null);
  const [flyAnimations, setFlyAnimations] = useState<TokenFlyState[]>([]);
  const canAddToken = currentTokenCount < MAX_STARTING_TT_TOKEN_COUNT;
  const canRemoveToken = currentTokenCount > MIN_STARTING_TT_TOKEN_COUNT;

  function getFlyAnimationOrigin(direction: Exclude<TokenFlyAnimation, null>) {
    const actionsElement = tokenActionsRef.current;
    const sourceElement =
      direction === "add" ? addButtonContentRef.current : removeButtonContentRef.current;
    if (!actionsElement) {
      return {
        originX: direction === "add" ? 0 : 0,
        originY: 0,
      };
    }
    if (!sourceElement) {
      return {
        originX:
          direction === "add"
            ? actionsElement.clientWidth * 0.25
            : actionsElement.clientWidth * 0.75,
        originY: actionsElement.clientHeight * 0.5,
      };
    }

    const actionsBounds = actionsElement.getBoundingClientRect();
    const sourceBounds = sourceElement.getBoundingClientRect();
    return {
      originX: sourceBounds.left - actionsBounds.left + sourceBounds.width / 2,
      originY: sourceBounds.top - actionsBounds.top + sourceBounds.height / 2,
    };
  }

  function triggerFlyAnimation(direction: Exclude<TokenFlyAnimation, null>) {
    animationKeyRef.current += 1;
    const { originX, originY } = getFlyAnimationOrigin(direction);
    const nextFlyAnimation: TokenFlyState = {
      direction,
      originX,
      originY,
      key: animationKeyRef.current,
    };
    setFlyAnimations((currentAnimations) => [...currentAnimations, nextFlyAnimation]);
  }

  function clearFlyAnimation(animationKey: number) {
    setFlyAnimations((currentAnimations) =>
      currentAnimations.filter((animation) => animation.key !== animationKey),
    );
  }

  return (
    <div className={styles.menuTokenActions} ref={tokenActionsRef}>
      <button
        className={`${styles.menuActionButton} ${styles.menuActionButtonAdd}`}
        disabled={!canAddToken}
        onClick={() => {
          if (!canAddToken) {
            return;
          }
          onAwardTt();
          triggerFlyAnimation("add");
        }}
        type="button"
      >
        <span className={styles.menuTokenActionContent} ref={addButtonContentRef}>
          +1
          <TtTokenIcon className={styles.menuTokenIcon} />
        </span>
      </button>
      <button
        className={`${styles.menuActionButton} ${styles.menuActionButtonRemove}`}
        disabled={!canRemoveToken}
        onClick={() => {
          if (!canRemoveToken) {
            return;
          }
          onRemoveTt();
          triggerFlyAnimation("remove");
        }}
        type="button"
      >
        <span className={styles.menuTokenActionContent} ref={removeButtonContentRef}>
          -1
          <TtTokenIcon className={styles.menuTokenIcon} />
        </span>
      </button>
      {flyAnimations.map((flyAnimation) => (
        <span
          className={styles.menuTokenFlyoutAnchor}
          key={flyAnimation.key}
          style={{ left: flyAnimation.originX, top: flyAnimation.originY }}
        >
          <motion.span
            animate="animate"
            className={`${styles.menuTokenFlyout} ${
              flyAnimation.direction === "add"
                ? styles.menuTokenFlyoutAdd
                : styles.menuTokenFlyoutRemove
            }`}
            initial="initial"
            onAnimationComplete={() => clearFlyAnimation(flyAnimation.key)}
            transition={createMenuTokenAdjustFlyoutTransition(reduceMotion)}
            variants={createMenuTokenAdjustFlyoutVariants(reduceMotion, flyAnimation.direction)}
          >
            <motion.span
              animate="animate"
              className={styles.menuTokenFlyoutContent}
              initial="initial"
              transition={createMenuTokenAdjustFlyoutPopTransition(reduceMotion)}
              variants={createMenuTokenAdjustFlyoutPopVariants(reduceMotion)}
            >
              {flyAnimation.direction === "add" ? "+1" : "-1"}
              <TtTokenIcon className={styles.menuTokenFlyoutIcon} />
            </motion.span>
          </motion.span>
        </span>
      ))}
    </div>
  );
}

interface GameMenuPlayerItemProps {
  currentPlayerId: string | null;
  onAwardTt: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onRemoveTt: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  player: PublicPlayerState;
  roomState: PublicRoomState;
  t: Translate;
}

function GameMenuPlayerItem({
  currentPlayerId,
  onAwardTt,
  onKickPlayer,
  onRemoveTt,
  onTransferHost,
  player,
  roomState,
  t,
}: GameMenuPlayerItemProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);
  const expandedContentRef = useRef<HTMLDivElement | null>(null);
  const [expandedContentHeight, setExpandedContentHeight] = useState(0);
  const isCurrentPlayerHost = roomState.hostId === currentPlayerId;
  const isCurrentPlayer = player.id === currentPlayerId;
  const isDisconnected = player.connectionStatus === "disconnected";
  const canTransferHost =
    isCurrentPlayerHost && !isCurrentPlayer && !player.isHost && !isDisconnected;
  const canKickPlayer = isCurrentPlayerHost && !isCurrentPlayer;
  const hasTokenActions = roomState.settings.ttModeEnabled && isCurrentPlayerHost;
  const hasTransferAction = isCurrentPlayerHost && !isCurrentPlayer;
  const hasExpandableContent = hasTransferAction;
  const cardCount = roomState.timelines[player.id]?.length ?? 0;
  const cardCountLabel = t("gameMenu.cards", {
    count: cardCount,
  });

  useLayoutEffect(() => {
    const contentElement = expandedContentRef.current;
    if (!contentElement) {
      return;
    }

    const updateMeasuredHeight = () => {
      setExpandedContentHeight(contentElement.scrollHeight);
    };

    updateMeasuredHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateMeasuredHeight();
    });

    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  function handleTransferHost() {
    if (!canTransferHost) {
      return;
    }
    onTransferHost(player.id);
    setIsTransferConfirmOpen(false);
  }

  function handleKickPlayer() {
    if (!canKickPlayer) {
      return;
    }
    onKickPlayer(player.id);
    setIsKickConfirmOpen(false);
  }

  return (
    <li
      className={`${styles.menuPlayerItem} ${
        isDisconnected ? styles.menuPlayerItemDisconnected : ""
      }`}
    >
      <button
        aria-expanded={isExpanded}
        className={styles.menuPlayerExpandButton}
        disabled={!hasExpandableContent}
        onClick={() => {
          if (!hasExpandableContent) {
            return;
          }

          setIsExpanded((currentValue) => !currentValue);
        }}
        type="button"
      >
        <div className={styles.menuPlayerInfoRow}>
          <div className={styles.menuPlayerIdentity}>
            <div className={styles.menuPlayerNameRow}>
              <strong className={styles.menuPlayerName}>
                {isCurrentPlayer ? t("common.you") : player.displayName}
              </strong>
              <div className={styles.menuPlayerBadges}>
                <Badge className={styles.menuPlayerBadge} size="sm" variant="neutral">
                  <CardCountAmount
                    amount={cardCount}
                    ariaLabel={cardCountLabel}
                    className={styles.menuPlayerCardCount}
                  />
                </Badge>
                {roomState.settings.ttModeEnabled ? (
                  <Badge className={styles.menuPlayerBadge} size="sm" variant="neutral">
                    <TtTokenAmount amount={player.ttTokenCount} />
                  </Badge>
                ) : null}
                {player.isHost ? (
                  <Badge className={styles.menuPlayerBadge} size="sm" variant="strong">
                    {t("gameMenu.host")}
                  </Badge>
                ) : null}
                {isDisconnected ? (
                  <Badge className={styles.menuPlayerBadge} size="sm" variant="mutedSurface">
                    {t("gameMenu.offline")}
                  </Badge>
                ) : null}
                {player.id === roomState.turn?.activePlayerId ? (
                  <Badge className={styles.menuPlayerBadge} size="sm" variant="mutedSurface">
                    {t("gameMenu.turn")}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </button>
      {hasTokenActions ? (
        <TokenAdjustButtons
          currentTokenCount={player.ttTokenCount}
          onAwardTt={() => onAwardTt(player.id)}
          onRemoveTt={() => onRemoveTt(player.id)}
        />
      ) : null}
      {hasExpandableContent ? (
        <button
          aria-expanded={isExpanded}
          aria-label={t(
            isExpanded ? "gameMenu.hideHostTransferControls" : "gameMenu.showHostTransferControls",
            {
              playerName: isCurrentPlayer ? t("common.you").toLowerCase() : player.displayName,
            },
          )}
          className={`${styles.menuPlayerExpandIndicatorButton} ${
            hasTokenActions ? styles.menuPlayerExpandIndicatorAfterTokens : ""
          }`}
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`${styles.menuPlayerExpandIndicator} ${
              isExpanded ? styles.menuPlayerExpandIndicatorOpen : ""
            }`}
          />
        </button>
      ) : null}
      <motion.div
        animate={createMeasuredDisclosureMotion(
          reduceMotion,
          isExpanded && hasExpandableContent,
          expandedContentHeight,
        )}
        initial={false}
        style={{
          overflow: "hidden",
          pointerEvents: isExpanded && hasExpandableContent ? "auto" : "none",
        }}
        transition={createStandardTransition(reduceMotion)}
      >
        <div className={styles.menuPlayerExpandedActions} ref={expandedContentRef}>
          {hasTransferAction ? (
            <button
              className={`${styles.menuActionButton} ${styles.menuTransferHostButton}`}
              disabled={!canTransferHost}
              onClick={() => setIsTransferConfirmOpen(true)}
              type="button"
            >
              {t("gameMenu.transferHost")}
            </button>
          ) : null}
          {canKickPlayer ? (
            <button
              className={`${styles.menuActionButton} ${styles.menuKickPlayerButton}`}
              onClick={() => setIsKickConfirmOpen(true)}
              type="button"
            >
              {t("gameMenu.kickPlayer")}
            </button>
          ) : null}
        </div>
      </motion.div>
      <MotionDialogPortal
        cardClassName={styles.transferConfirmCard}
        isOpen={isTransferConfirmOpen}
        label={t("gameMenu.transferHostControls")}
        onClose={() => setIsTransferConfirmOpen(false)}
        overlayClassName={styles.transferConfirmOverlay}
      >
        <div className={styles.transferConfirmHeaderRow}>
          <p className={styles.transferConfirmEyebrow}>{t("gameMenu.hostTransfer")}</p>
          <button
            aria-label={t("gameMenu.closeHostTransferConfirmation")}
            className={styles.transferConfirmCloseButton}
            onClick={() => setIsTransferConfirmOpen(false)}
            type="button"
          >
            x
          </button>
        </div>
        <h2 className={styles.transferConfirmTitle}>{t("gameMenu.transferHostQuestion")}</h2>
        <p className={styles.transferConfirmBody}>
          {t("gameMenu.transferHostBody", { playerName: player.displayName })}
        </p>
        <div className={styles.transferConfirmActions}>
          <button
            className={`${styles.menuActionButton} ${styles.transferConfirmSecondaryButton}`}
            onClick={() => setIsTransferConfirmOpen(false)}
            type="button"
          >
            {t("common.cancel")}
          </button>
          <button
            className={`${styles.menuActionButton} ${styles.menuTransferHostButton}`}
            disabled={!canTransferHost}
            onClick={handleTransferHost}
            type="button"
          >
            {t("gameMenu.transferHost")}
          </button>
        </div>
      </MotionDialogPortal>
      <MotionDialogPortal
        cardClassName={styles.transferConfirmCard}
        isOpen={isKickConfirmOpen}
        label={t("gameMenu.kickPlayer")}
        onClose={() => setIsKickConfirmOpen(false)}
        overlayClassName={styles.transferConfirmOverlay}
      >
        <div className={styles.transferConfirmHeaderRow}>
          <p className={styles.transferConfirmEyebrow}>{t("gameMenu.removePlayer")}</p>
          <button
            aria-label={t("gameMenu.closeKickPlayerConfirmation")}
            className={styles.transferConfirmCloseButton}
            onClick={() => setIsKickConfirmOpen(false)}
            type="button"
          >
            x
          </button>
        </div>
        <h2 className={styles.transferConfirmTitle}>
          {t("gameMenu.removePlayerQuestion", { playerName: player.displayName })}
        </h2>
        <p className={styles.transferConfirmBody}>
          {t("gameMenu.removePlayerBody", { playerName: player.displayName })}
        </p>
        <div className={styles.transferConfirmActions}>
          <button
            className={`${styles.menuActionButton} ${styles.transferConfirmSecondaryButton}`}
            onClick={() => setIsKickConfirmOpen(false)}
            type="button"
          >
            {t("common.cancel")}
          </button>
          <button
            className={`${styles.menuActionButton} ${styles.menuKickPlayerButton}`}
            onClick={handleKickPlayer}
            type="button"
          >
            {t("gameMenu.removePlayer")}
          </button>
        </div>
      </MotionDialogPortal>
    </li>
  );
}

interface PlaybackTabContentProps {
  playback: HostPlaybackState;
  roomState: PublicRoomState;
  t: Translate;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function PlaybackTabContent({ playback, roomState, t }: PlaybackTabContentProps) {
  const { isReady, isPlaying, position, duration, pause, resume, seek } = playback;
  const { currentTrackCard, status } = roomState;
  const showTrackDetails = status === "reveal" || status === "finished";
  const hasTrack = currentTrackCard !== null;

  return (
    <div className={styles.playbackSection}>
      {hasTrack ? (
        <div className={styles.playbackArtworkLarge}>
          {showTrackDetails && currentTrackCard.artworkUrl ? (
            <div className={styles.playbackArtworkWrapper}>
              {currentTrackCard.releaseYear !== undefined ? (
                <p className={styles.playbackYear}>{currentTrackCard.releaseYear}</p>
              ) : null}
              <img alt="" className={styles.playbackArtworkImg} src={currentTrackCard.artworkUrl} />
            </div>
          ) : (
            <PlaybackMusicNoteIcon />
          )}
        </div>
      ) : null}

      <div className={styles.playbackControls}>
        <div className={styles.playbackTrackRow}>
          <div className={styles.playbackMeta}>
            {hasTrack && showTrackDetails ? (
              <>
                <div className={styles.playbackMetaRow}>
                  <p className={styles.playbackTitle}>{currentTrackCard.title}</p>
                </div>
                <p className={styles.playbackArtist}>{currentTrackCard.artist}</p>
                {currentTrackCard.albumTitle ? (
                  <p className={styles.playbackAlbum}>{currentTrackCard.albumTitle}</p>
                ) : null}
              </>
            ) : (
              <p className={styles.playbackHiddenNote}>
                {hasTrack ? t("gameMenu.songDetailsHidden") : t("gameMenu.noSongLoaded")}
              </p>
            )}
          </div>
        </div>

        {hasTrack && duration > 0 ? (
          <div className={styles.playbackProgressBlock}>
            <input
              aria-label={t("gameMenu.playbackPosition")}
              className={styles.playbackSlider}
              max={duration}
              min={0}
              onChange={(e) => seek(Number(e.target.value))}
              step={1000}
              type="range"
              value={Math.min(position, duration)}
            />
            <div className={styles.playbackTimeLabels}>
              <span>{formatMs(position)}</span>
              <span>{formatMs(duration)}</span>
            </div>
          </div>
        ) : null}

        <div className={styles.playbackActions}>
          {hasTrack ? (
            <button
              aria-label={isPlaying ? t("gameMenu.pause") : t("gameMenu.play")}
              className={styles.playbackCircleBtn}
              disabled={!isReady}
              onClick={isPlaying ? pause : resume}
              type="button"
            >
              {isPlaying ? <PlaybackPauseIcon /> : <PlaybackPlayIcon />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlaybackPlayIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={20} viewBox="0 0 24 24" width={32}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PlaybackPauseIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={20} viewBox="0 0 24 24" width={32}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function PlaybackMusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={48} viewBox="0 0 24 24" width={48}>
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}

interface HistoryTabContentProps {
  entries: GameHistoryEntry[];
  t: Translate;
}

function HistoryTabContent({ entries, t }: HistoryTabContentProps) {
  if (entries.length === 0) {
    return <div className={styles.historyEmpty}>{t("gameMenu.noCardsPlayed")}</div>;
  }

  return (
    <div className={styles.historySection}>
      <ul className={styles.historyList}>
        {[...entries].reverse().map((entry, index) => (
          <li key={`${entry.card.id}-${index}`} className={styles.historyItem}>
            <div className={styles.historyItemArtwork}>
              {entry.card.artworkUrl ? (
                <img alt="" className={styles.historyItemArtworkImg} src={entry.card.artworkUrl} />
              ) : (
                <HistoryMusicNoteIcon />
              )}
            </div>
            <div className={styles.historyItemInfo}>
              <span className={styles.historyItemTitle}>{entry.card.title}</span>
              <span className={styles.historyItemMeta}>
                {entry.card.artist}
                {" · "}
                {entry.card.revealedYear ?? entry.card.releaseYear}
              </span>
            </div>
            <div className={styles.historyItemOutcome}>
              <span className={styles.historyItemPlayer}>{entry.playerDisplayName}</span>
              <div
                className={`${styles.historyOutcomeCircle} ${
                  entry.wasCorrect ? styles.historyOutcomeCorrect : styles.historyOutcomeWrong
                }`}
              >
                {entry.wasCorrect ? <HistoryCheckIcon /> : <HistoryXIcon />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryMusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={18} viewBox="0 0 24 24" width={18}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function HistoryCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={14}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function HistoryXIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={14}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function createGameMenuTabs({
  currentPlayerId,
  historyEntries,
  roomState,
  onAwardTt,
  onKickPlayer,
  onRemoveTt,
  onTransferHost,
  playback,
  t,
}: CreateGameMenuTabsOptions): AppShellMenuTab[] {
  const isHost = roomState.hostId === currentPlayerId;
  const hasPlaybackTab =
    isHost &&
    roomState.settings.spotifyAuthStatus === "connected" &&
    roomState.settings.playlistImported &&
    playback !== undefined;

  return [
    {
      id: "players",
      label: t("gameMenu.tabs.players"),
      content: (
        <div className={styles.menuInfoSection}>
          <h3 className={styles.menuInfoTitle}>{t("gameMenu.playersSummary")}</h3>
          <ul className={styles.menuPlayerList}>
            {roomState.players.map((player) => (
              <GameMenuPlayerItem
                currentPlayerId={currentPlayerId}
                key={player.id}
                onAwardTt={onAwardTt}
                onKickPlayer={onKickPlayer}
                onRemoveTt={onRemoveTt}
                onTransferHost={onTransferHost}
                player={player}
                roomState={roomState}
                t={t}
              />
            ))}
          </ul>
        </div>
      ),
    },
    ...(hasPlaybackTab
      ? [
          {
            id: "playback" as const,
            label: t("gameMenu.tabs.playback"),
            content: <PlaybackTabContent playback={playback!} roomState={roomState} t={t} />,
          },
        ]
      : []),
    {
      id: "history" as const,
      label: t("gameMenu.tabs.history"),
      content: <HistoryTabContent entries={historyEntries} t={t} />,
    },
    {
      id: "view",
      label: t("gameMenu.tabs.view"),
      content: <p className={styles.menuPlaceholder}>{t("gameMenu.viewPlaceholder")}</p>,
    },
    {
      id: "settings",
      label: t("gameMenu.tabs.theme"),
      content: <p className={styles.menuPlaceholder}>{t("gameMenu.themePlaceholder")}</p>,
    },
    {
      id: "language",
      label: t("appShell.menu.languageTab"),
      content: null,
    },
    ...(isHost
      ? [
          {
            id: "dev" as const,
            label: t("gameMenu.tabs.diagnostics"),
            content: (
              <p className={styles.menuPlaceholder}>{t("gameMenu.diagnosticsPlaceholder")}</p>
            ),
          },
        ]
      : []),
  ];
}
