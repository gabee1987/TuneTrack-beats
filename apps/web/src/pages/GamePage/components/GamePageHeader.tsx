import { memo, useState } from "react";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import { useI18n } from "../../../features/i18n";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import { usePageLayoutMode } from "../../../hooks/usePageLayoutMode";
import type { GamePageHeaderModel } from "../GamePage.types";
import { GamePageHeaderActions } from "./GamePageHeaderActions";
import { GamePageStatusChips } from "./GamePageStatusChips";
import { HeaderLeadersStrip } from "./HeaderLeadersStrip";
import styles from "../gamePageChrome.module.css";

interface GamePageHeaderProps {
  model: GamePageHeaderModel;
}

function GamePageHeaderComponent({ model }: GamePageHeaderProps) {
  const { t } = useI18n();
  const layoutMode = usePageLayoutMode();
  const [menuHintAnchor, setMenuHintAnchor] = useState<HTMLElement | null>(null);
  const [tokenHintAnchor, setTokenHintAnchor] = useState<HTMLElement | null>(null);
  const {
    closeRoomActionStatus,
    currentPlayerId,
    handleCloseRoom,
    handleSkipTurn,
    hostId,
    isCloseRoomPending,
    isSkipTurnPending,
    leadingPlayers,
    menuTabs,
    roomId,
    showMiniStandings,
    showPhaseChip,
    showRoomCodeChip,
    showTimelineHints,
    showTurnNumberChip,
    statusBadgeText,
    status,
    statusDetailText,
    ttModeEnabled,
    turnNumber,
    updateViewPreferences,
    visibleTimelineCardCount,
    visibleTimelinePlayerId,
    visibleTimelineTtCount,
    visibleTimelineTitle,
    skipTurnActionStatus,
  } = model;
  const showStatusTokenCount = ttModeEnabled;
  const isHost = hostId === visibleTimelinePlayerId;
  const isCurrentPlayerLeading = leadingPlayers[0]?.id === visibleTimelinePlayerId;
  const visibleTimelineCardCountLabel = t("game.header.cardCount", {
    count: visibleTimelineCardCount,
    plural: visibleTimelineCardCount === 1 ? "" : "s",
  });
  const getCardCountLabel = (count: number) =>
    t("game.header.cardCount", {
      count,
      plural: count === 1 ? "" : "s",
    });

  return (
    <header
      className={`${styles.header}${layoutMode === "mobile" ? ` ${styles.headerMobile}` : ""}`}
    >
      <div className={styles.headerMain}>
        <GamePageStatusChips
          roomId={roomId}
          showPhaseChip={showPhaseChip}
          showRoomCodeChip={showRoomCodeChip}
          showTurnNumberChip={showTurnNumberChip}
          status={status}
          turnNumber={turnNumber}
        />
        <HeaderLeadersStrip
          getCardCountLabel={getCardCountLabel}
          leadingPlayers={leadingPlayers}
          show={showMiniStandings}
          ttModeEnabled={ttModeEnabled}
        />
      </div>
      <div className={styles.headerAside}>
        <div className={styles.headerActionRow}>
          <div
            className={`${styles.statusBadge} ${
              isCurrentPlayerLeading ? styles.statusBadgeLeading : ""
            }`}
          >
            {isCurrentPlayerLeading ? (
              <img alt="" aria-hidden="true" className={styles.statusBadgeCrown} src="/crown.png" />
            ) : null}
            <span className={styles.statusBadgeTextGroup}>
              <span className={styles.statusBadgeDefault}>{statusBadgeText}</span>
              <span className={styles.statusBadgeTimeline}>{visibleTimelineTitle}</span>
            </span>
            {isHost ? (
              <span className={styles.statusBadgeHostText}>{t("gameMenu.host")}</span>
            ) : null}
            <span className={styles.statusBadgeCounters}>
              <CardCountAmount
                amount={visibleTimelineCardCount}
                ariaLabel={visibleTimelineCardCountLabel}
                className={styles.statusBadgeCounter}
              />
              {showStatusTokenCount ? (
                <>
                  <span aria-hidden="true" className={styles.statusBadgeCounterSeparator}>
                    ·
                  </span>
                  <span ref={setTokenHintAnchor}>
                    <TokenCountAmount amount={visibleTimelineTtCount} />
                  </span>
                </>
              ) : null}
            </span>
          </div>
          <GamePageHeaderActions
            closeRoomActionStatus={closeRoomActionStatus}
            handleCloseRoom={handleCloseRoom}
            handleSkipTurn={handleSkipTurn}
            isCloseRoomPending={isCloseRoomPending}
            isHost={hostId === currentPlayerId}
            isSkipTurnPending={isSkipTurnPending}
            menuTabs={menuTabs}
            menuTriggerRef={setMenuHintAnchor}
            roomId={roomId}
            showMiniStandings={showMiniStandings}
            skipTurnActionStatus={skipTurnActionStatus}
            status={status}
            updateViewPreferences={updateViewPreferences}
          />
        </div>
        {showTimelineHints && statusDetailText ? (
          <p className={styles.statusCaption}>{statusDetailText}</p>
        ) : null}
      </div>
      <FirstRunHint
        anchor={tokenHintAnchor}
        id="game-tokens"
        isEligible={
          ttModeEnabled && visibleTimelinePlayerId === currentPlayerId && visibleTimelineTtCount > 0
        }
      />
      <FirstRunHint anchor={menuHintAnchor} id="game-menu" isEligible />
    </header>
  );
}

function areHeaderModelsEqual(
  previousModel: GamePageHeaderModel,
  nextModel: GamePageHeaderModel,
): boolean {
  return (
    previousModel.closeRoomActionStatus === nextModel.closeRoomActionStatus &&
    previousModel.currentPlayerId === nextModel.currentPlayerId &&
    previousModel.handleCloseRoom === nextModel.handleCloseRoom &&
    previousModel.handleSkipTurn === nextModel.handleSkipTurn &&
    previousModel.hostId === nextModel.hostId &&
    previousModel.isCloseRoomPending === nextModel.isCloseRoomPending &&
    previousModel.isSkipTurnPending === nextModel.isSkipTurnPending &&
    previousModel.leadingPlayers === nextModel.leadingPlayers &&
    previousModel.menuTabs === nextModel.menuTabs &&
    previousModel.roomId === nextModel.roomId &&
    previousModel.showMiniStandings === nextModel.showMiniStandings &&
    previousModel.showPhaseChip === nextModel.showPhaseChip &&
    previousModel.showRoomCodeChip === nextModel.showRoomCodeChip &&
    previousModel.showTimelineHints === nextModel.showTimelineHints &&
    previousModel.showTurnNumberChip === nextModel.showTurnNumberChip &&
    previousModel.status === nextModel.status &&
    previousModel.statusBadgeText === nextModel.statusBadgeText &&
    previousModel.statusDetailText === nextModel.statusDetailText &&
    previousModel.skipTurnActionStatus === nextModel.skipTurnActionStatus &&
    previousModel.ttModeEnabled === nextModel.ttModeEnabled &&
    previousModel.turnNumber === nextModel.turnNumber &&
    previousModel.updateViewPreferences === nextModel.updateViewPreferences &&
    previousModel.visibleTimelineCardCount === nextModel.visibleTimelineCardCount &&
    previousModel.visibleTimelinePlayerId === nextModel.visibleTimelinePlayerId &&
    previousModel.visibleTimelineTtCount === nextModel.visibleTimelineTtCount &&
    previousModel.visibleTimelineTitle === nextModel.visibleTimelineTitle
  );
}

export const GamePageHeader = memo(GamePageHeaderComponent, (previousProps, nextProps) =>
  areHeaderModelsEqual(previousProps.model, nextProps.model),
);
