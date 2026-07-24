import { memo } from "react";
import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import { Chip, IconButton } from "../../../features/ui/primitives";
import { usePageLayoutMode } from "../../../hooks/usePageLayoutMode";
import type { GamePageHeaderModel } from "../GamePage.types";
import { HeaderLeadersStrip } from "./HeaderLeadersStrip";
import styles from "../gamePageStyles";

interface GamePageHeaderProps {
  model: GamePageHeaderModel;
}

function GamePageHeaderComponent({ model }: GamePageHeaderProps) {
  const { t } = useI18n();
  const layoutMode = usePageLayoutMode();
  const {
    currentPlayerId,
    handleCloseRoom,
    handleSkipTurn,
    leadingPlayers,
    menuTabs,
    roomState,
    showMiniStandings,
    showPhaseChip,
    showRoomCodeChip,
    showTimelineHints,
    showTurnNumberChip,
    statusBadgeText,
    statusDetailText,
    updateViewPreferences,
    visibleTimelineCardCount,
    visibleTimelinePlayerId,
    visibleTimelineTtCount,
    visibleTimelineTitle,
  } = model;
  const showStatusTokenCount = roomState.settings.ttModeEnabled;
  const isHost = roomState.hostId === visibleTimelinePlayerId;
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
        <div className={styles.headerChipRow}>
          {showRoomCodeChip ? (
            <Chip>{t("game.header.roomChip", { roomId: roomState.roomId })}</Chip>
          ) : null}
          {showPhaseChip ? <Chip>{t(`game.phase.${roomState.status}`)}</Chip> : null}
          {showTurnNumberChip ? (
            <Chip className={styles.headerChipTurn}>
              {t("game.header.turnChip", {
                turnNumber: roomState.turn?.turnNumber ?? "-",
              })}
            </Chip>
          ) : null}
        </div>
        <HeaderLeadersStrip
          getCardCountLabel={getCardCountLabel}
          leadingPlayers={leadingPlayers}
          roomState={roomState}
          show={showMiniStandings}
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
                  <TokenCountAmount amount={visibleTimelineTtCount} />
                </>
              ) : null}
            </span>
          </div>
          <IconButton
            aria-label={
              showMiniStandings
                ? t("game.header.hideLeaderboard")
                : t("game.header.showLeaderboard")
            }
            onClick={() =>
              updateViewPreferences({
                showMiniStandings: !showMiniStandings,
              })
            }
            title={
              showMiniStandings
                ? t("game.header.hideLeaderboard")
                : t("game.header.showLeaderboard")
            }
          >
            <svg aria-hidden="true" className={styles.headerIcon} fill="none" viewBox="0 0 24 24">
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
          </IconButton>
          <AppShellMenu
            subtitle={t("gameMenu.lobbyNameSubtitle")}
            tabs={menuTabs}
            title={roomState.roomId}
            {...(roomState.hostId === currentPlayerId
              ? {
                  footerActions: [
                    ...(roomState.status === "turn"
                      ? [
                          {
                            label: t("game.controls.skipTurn"),
                            onClick: handleSkipTurn,
                            tone: "neutral" as const,
                          },
                        ]
                      : []),
                    {
                      label: t("game.header.closeRoom"),
                      onClick: handleCloseRoom,
                      tone: "danger" as const,
                    },
                  ],
                }
              : {})}
          />
        </div>
        {showTimelineHints && statusDetailText ? (
          <p className={styles.statusCaption}>{statusDetailText}</p>
        ) : null}
      </div>
    </header>
  );
}

function areHeaderModelsEqual(
  previousModel: GamePageHeaderModel,
  nextModel: GamePageHeaderModel,
): boolean {
  return (
    previousModel.currentPlayerId === nextModel.currentPlayerId &&
    previousModel.handleCloseRoom === nextModel.handleCloseRoom &&
    previousModel.handleSkipTurn === nextModel.handleSkipTurn &&
    previousModel.leadingPlayers === nextModel.leadingPlayers &&
    previousModel.menuTabs === nextModel.menuTabs &&
    previousModel.roomState === nextModel.roomState &&
    previousModel.showMiniStandings === nextModel.showMiniStandings &&
    previousModel.showPhaseChip === nextModel.showPhaseChip &&
    previousModel.showRoomCodeChip === nextModel.showRoomCodeChip &&
    previousModel.showTimelineHints === nextModel.showTimelineHints &&
    previousModel.showTurnNumberChip === nextModel.showTurnNumberChip &&
    previousModel.statusBadgeText === nextModel.statusBadgeText &&
    previousModel.statusDetailText === nextModel.statusDetailText &&
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
