import { memo } from "react";
import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { TtTokenAmount } from "../../../features/ui/TtToken";
import type { GamePageHeaderModel } from "../GamePage.types";
import styles from "../GamePage.module.css";

interface GamePageHeaderProps {
  model: GamePageHeaderModel;
}

function GamePageHeaderComponent({ model }: GamePageHeaderProps) {
  const { t } = useI18n();
  const {
    currentPlayerId,
    handleCloseRoom,
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

  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <div className={styles.headerChipRow}>
          {showRoomCodeChip ? (
            <span className={styles.headerChip}>
              {t("game.header.roomChip", { roomId: roomState.roomId })}
            </span>
          ) : null}
          {showPhaseChip ? (
            <span className={styles.headerChip}>{t(`game.phase.${roomState.status}`)}</span>
          ) : null}
          {showTurnNumberChip ? (
            <span className={`${styles.headerChip} ${styles.headerChipTurn}`}>
              {t("game.header.turnChip", {
                turnNumber: roomState.turn?.turnNumber ?? "-",
              })}
            </span>
          ) : null}
        </div>
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
              <span
                aria-label={visibleTimelineCardCountLabel}
                className={styles.statusBadgeCounter}
              >
                <span aria-hidden="true">{visibleTimelineCardCount}</span>
                <img
                  alt=""
                  aria-hidden="true"
                  className={styles.statusBadgeCardIcon}
                  draggable={false}
                  src="/card.png"
                />
              </span>
              {showStatusTokenCount ? (
                <>
                  <span aria-hidden="true" className={styles.statusBadgeCounterSeparator}>
                    ·
                  </span>
                  <TtTokenAmount amount={visibleTimelineTtCount} />
                </>
              ) : null}
            </span>
          </div>
          {showMiniStandings ? (
            <div className={styles.headerLeadersStrip}>
              {leadingPlayers.map((player, index) => {
                const cardCount = roomState.timelines[player.id]?.length ?? 0;
                const cardCountLabel = t("game.header.cardCount", {
                  count: cardCount,
                  plural: cardCount === 1 ? "" : "s",
                });

                return (
                  <article className={styles.headerLeaderChip} key={player.id}>
                    <span className={styles.headerLeaderRank}>#{index + 1}</span>
                    <strong className={styles.headerLeaderName}>{player.displayName}</strong>
                    <span className={styles.headerLeaderMeta}>
                      <span aria-label={cardCountLabel} className={styles.headerLeaderCardCount}>
                        <span aria-hidden="true">{cardCount}</span>
                        <img
                          alt=""
                          aria-hidden="true"
                          className={styles.headerLeaderCardIcon}
                          draggable={false}
                          src="/card.png"
                        />
                      </span>
                      {roomState.settings.ttModeEnabled ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <TtTokenAmount amount={player.ttTokenCount} />
                        </>
                      ) : null}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : null}
          <button
            aria-label={
              showMiniStandings
                ? t("game.header.hideLeaderboard")
                : t("game.header.showLeaderboard")
            }
            className={styles.headerIconButton}
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
            type="button"
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
          </button>
          <AppShellMenu
            subtitle={t("gameMenu.lobbyNameSubtitle")}
            tabs={menuTabs}
            title={roomState.roomId}
            {...(roomState.hostId === currentPlayerId
              ? {
                  footerAction: {
                    label: t("game.header.closeRoom"),
                    onClick: handleCloseRoom,
                    tone: "danger" as const,
                  },
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
