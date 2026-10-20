import type { PublicPlayerState } from "@tunetrack/shared/client";
import { useEffect, useState } from "react";
import type { Translate } from "../../../features/i18n";
import styles from "../gamePageMenu.module.css";
import type {
  AwardTtActionState,
  KickPlayerActionState,
  TransferHostActionState,
} from "../GamePage.types";
import { GameMenuPlayerActions } from "./GameMenuPlayerActions";
import { GameMenuPlayerRow } from "./GameMenuPlayerRow";
import { PlayerConfirmDialog } from "./PlayerConfirmDialog";
import { TokenAdjustButtons } from "./TokenAdjustButtons";

interface GameMenuPlayerItemProps {
  awardTtActionState: AwardTtActionState | null;
  cardCount: number;
  isActiveTurnPlayer: boolean;
  isAwardTtPending: boolean;
  /** This row shows the viewer. */
  isCurrentPlayer: boolean;
  isKickPlayerPending: boolean;
  isTransferHostPending: boolean;
  isViewerHost: boolean;
  kickPlayerActionState: KickPlayerActionState | null;
  onAwardTt: (playerId: string) => boolean;
  onKickPlayer: (playerId: string) => void;
  onRemoveTt: (playerId: string) => boolean;
  onTransferHost: (playerId: string) => void;
  player: PublicPlayerState;
  t: Translate;
  transferHostActionState: TransferHostActionState | null;
  ttModeEnabled: boolean;
}

const TRANSFER_LABEL_KEY_BY_STATUS = {
  idle: "gameMenu.transferHost",
  pending: "gameMenu.transferHost",
  retrying: "gameMenu.transferHostRetrying",
  failed: "gameMenu.retryTransferHost",
} as const;

const KICK_LABEL_KEY_BY_STATUS = {
  idle: "gameMenu.kickPlayer",
  pending: "gameMenu.kickPlayer",
  retrying: "gameMenu.kickPlayerRetrying",
  failed: "gameMenu.retryKickPlayer",
} as const;

const REMOVE_LABEL_KEY_BY_STATUS = {
  ...KICK_LABEL_KEY_BY_STATUS,
  idle: "gameMenu.removePlayer",
  pending: "gameMenu.removePlayer",
} as const;

function getRowActionStatus(
  actionState: TransferHostActionState | KickPlayerActionState | null,
  playerId: string,
) {
  return actionState?.playerId === playerId ? actionState.status : "idle";
}

export function GameMenuPlayerItem({
  awardTtActionState,
  cardCount,
  isActiveTurnPlayer,
  isAwardTtPending,
  isCurrentPlayer,
  isKickPlayerPending,
  isTransferHostPending,
  isViewerHost,
  kickPlayerActionState,
  onAwardTt,
  onKickPlayer,
  onRemoveTt,
  onTransferHost,
  player,
  t,
  transferHostActionState,
  ttModeEnabled,
}: GameMenuPlayerItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);
  const isDisconnected = player.connectionStatus === "disconnected";
  const hasHostActions = isViewerHost && !isCurrentPlayer;
  const canTransferHost =
    hasHostActions && !player.isHost && !isDisconnected && !isTransferHostPending;
  const canKickPlayer = hasHostActions && !isKickPlayerPending;
  const hasTokenActions = ttModeEnabled && isViewerHost;
  const transferActionStatus = getRowActionStatus(transferHostActionState, player.id);
  const kickActionStatus = getRowActionStatus(kickPlayerActionState, player.id);
  const transferButtonLabel = t(TRANSFER_LABEL_KEY_BY_STATUS[transferActionStatus]);

  useEffect(() => {
    if (!hasHostActions) {
      setIsTransferConfirmOpen(false);
      setIsKickConfirmOpen(false);
    }
  }, [hasHostActions]);

  return (
    <li
      className={`${styles.menuPlayerItem} ${
        isDisconnected ? styles.menuPlayerItemDisconnected : ""
      }`}
    >
      <GameMenuPlayerRow
        canExpand={hasHostActions}
        cardCount={cardCount}
        isActiveTurnPlayer={isActiveTurnPlayer}
        isCurrentPlayer={isCurrentPlayer}
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded((currentValue) => !currentValue)}
        player={player}
        t={t}
        ttModeEnabled={ttModeEnabled}
      />
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
      {hasHostActions ? (
        <button
          aria-expanded={isExpanded}
          aria-label={t(
            isExpanded ? "gameMenu.hideHostTransferControls" : "gameMenu.showHostTransferControls",
            { playerName: player.displayName },
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
      <GameMenuPlayerActions
        canKickPlayer={canKickPlayer}
        canTransferHost={canTransferHost}
        hasTransferAction={hasHostActions}
        isOpen={isExpanded && hasHostActions}
        kickButtonLabel={t(KICK_LABEL_KEY_BY_STATUS[kickActionStatus])}
        onRequestKick={() => setIsKickConfirmOpen(true)}
        onRequestTransfer={() => setIsTransferConfirmOpen(true)}
        transferButtonLabel={transferButtonLabel}
      />
      <PlayerConfirmDialog
        body={t("gameMenu.transferHostBody", { playerName: player.displayName })}
        closeLabel={t("gameMenu.closeHostTransferConfirmation")}
        confirmButtonClassName={styles.menuTransferHostButton}
        confirmLabel={transferButtonLabel}
        eyebrow={t("gameMenu.hostTransfer")}
        isConfirmDisabled={!canTransferHost}
        isOpen={isTransferConfirmOpen}
        label={t("gameMenu.transferHostControls")}
        onConfirm={() => {
          if (canTransferHost) onTransferHost(player.id);
        }}
        onDismiss={() => setIsTransferConfirmOpen(false)}
        t={t}
        title={t("gameMenu.transferHostQuestion")}
      />
      <PlayerConfirmDialog
        body={t("gameMenu.removePlayerBody", { playerName: player.displayName })}
        closeLabel={t("gameMenu.closeKickPlayerConfirmation")}
        confirmButtonClassName={styles.menuKickPlayerButton}
        confirmLabel={t(REMOVE_LABEL_KEY_BY_STATUS[kickActionStatus])}
        eyebrow={t("gameMenu.removePlayer")}
        isConfirmDisabled={!canKickPlayer}
        isOpen={isKickConfirmOpen}
        label={t("gameMenu.kickPlayer")}
        onConfirm={() => {
          if (canKickPlayer) onKickPlayer(player.id);
        }}
        onDismiss={() => setIsKickConfirmOpen(false)}
        t={t}
        title={t("gameMenu.removePlayerQuestion", { playerName: player.displayName })}
      />
    </li>
  );
}
