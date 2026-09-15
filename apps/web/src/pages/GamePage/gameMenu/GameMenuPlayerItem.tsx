import { type PublicPlayerState, type PublicRoomState } from "@tunetrack/shared";
import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MotionDialogPortal,
  createMeasuredDisclosureMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import type { Translate } from "../../../features/i18n";
import { Badge } from "../../../features/ui/Badge";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import styles from "../gamePageStyles";
import type {
  AwardTtActionState,
  KickPlayerActionState,
  TransferHostActionState,
} from "../GamePage.types";
import { TokenAdjustButtons } from "./TokenAdjustButtons";

interface GameMenuPlayerItemProps {
  awardTtActionState: AwardTtActionState | null;
  currentPlayerId: string | null;
  isAwardTtPending: boolean;
  isKickPlayerPending: boolean;
  isTransferHostPending: boolean;
  kickPlayerActionState: KickPlayerActionState | null;
  onAwardTt: (playerId: string) => boolean;
  onKickPlayer: (playerId: string) => void;
  onRemoveTt: (playerId: string) => boolean;
  onTransferHost: (playerId: string) => void;
  player: PublicPlayerState;
  roomState: PublicRoomState;
  t: Translate;
  transferHostActionState: TransferHostActionState | null;
}

export function GameMenuPlayerItem({
  awardTtActionState,
  currentPlayerId,
  isAwardTtPending,
  isKickPlayerPending,
  isTransferHostPending,
  kickPlayerActionState,
  onAwardTt,
  onKickPlayer,
  onRemoveTt,
  onTransferHost,
  player,
  roomState,
  t,
  transferHostActionState,
}: GameMenuPlayerItemProps) {
  const reduceMotion = useReducedMotionPreference();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);
  const expandedContentRef = useRef<HTMLDivElement | null>(null);
  const [expandedContentHeight, setExpandedContentHeight] = useState(0);
  const isCurrentPlayerHost = roomState.hostId === currentPlayerId;
  const isCurrentPlayer = player.id === currentPlayerId;
  const isDisconnected = player.connectionStatus === "disconnected";
  const hasTransferPermission =
    isCurrentPlayerHost && !isCurrentPlayer && !player.isHost && !isDisconnected;
  const canTransferHost = hasTransferPermission && !isTransferHostPending;
  const hasKickPermission = isCurrentPlayerHost && !isCurrentPlayer;
  const canKickPlayer = hasKickPermission && !isKickPlayerPending;
  const hasTokenActions = roomState.settings.ttModeEnabled && isCurrentPlayerHost;
  const hasTransferAction = isCurrentPlayerHost && !isCurrentPlayer;
  const hasExpandableContent = hasTransferAction;
  const transferActionStatus =
    transferHostActionState?.playerId === player.id
      ? transferHostActionState.status
      : null;
  const transferButtonLabel =
    transferActionStatus === "retrying"
      ? t("gameMenu.transferHostRetrying")
      : transferActionStatus === "failed"
        ? t("gameMenu.retryTransferHost")
        : t("gameMenu.transferHost");
  const kickActionStatus =
    kickPlayerActionState?.playerId === player.id ? kickPlayerActionState.status : null;
  const kickButtonLabel =
    kickActionStatus === "retrying"
      ? t("gameMenu.kickPlayerRetrying")
      : kickActionStatus === "failed"
        ? t("gameMenu.retryKickPlayer")
        : t("gameMenu.kickPlayer");
  const removePlayerButtonLabel =
    kickActionStatus === "retrying"
      ? t("gameMenu.kickPlayerRetrying")
      : kickActionStatus === "failed"
        ? t("gameMenu.retryKickPlayer")
        : t("gameMenu.removePlayer");
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

  useEffect(() => {
    if (isTransferConfirmOpen && !hasTransferAction) {
      setIsTransferConfirmOpen(false);
    }
  }, [hasTransferAction, isTransferConfirmOpen]);

  useEffect(() => {
    if (isKickConfirmOpen && !hasKickPermission) {
      setIsKickConfirmOpen(false);
    }
  }, [hasKickPermission, isKickConfirmOpen]);

  function handleTransferHost() {
    if (!canTransferHost) {
      return;
    }
    onTransferHost(player.id);
  }

  function handleKickPlayer() {
    if (!canKickPlayer) {
      return;
    }
    onKickPlayer(player.id);
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
                    <TokenCountAmount amount={player.ttTokenCount} />
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
          actionState={awardTtActionState}
          currentTokenCount={player.ttTokenCount}
          isActionPending={isAwardTtPending}
          onAwardTt={() => onAwardTt(player.id)}
          onRemoveTt={() => onRemoveTt(player.id)}
          playerId={player.id}
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
              {transferButtonLabel}
            </button>
          ) : null}
          {canKickPlayer ? (
            <button
              className={`${styles.menuActionButton} ${styles.menuKickPlayerButton}`}
              onClick={() => setIsKickConfirmOpen(true)}
              type="button"
            >
              {kickButtonLabel}
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
          <CloseIconButton
            ariaLabel={t("gameMenu.closeHostTransferConfirmation")}
            className={styles.transferConfirmCloseButton}
            onClick={() => setIsTransferConfirmOpen(false)}
            size="sm"
          />
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
            {transferButtonLabel}
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
          <CloseIconButton
            ariaLabel={t("gameMenu.closeKickPlayerConfirmation")}
            className={styles.transferConfirmCloseButton}
            onClick={() => setIsKickConfirmOpen(false)}
            size="sm"
          />
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
            disabled={!canKickPlayer}
            onClick={handleKickPlayer}
            type="button"
          >
            {removePlayerButtonLabel}
          </button>
        </div>
      </MotionDialogPortal>
    </li>
  );
}
