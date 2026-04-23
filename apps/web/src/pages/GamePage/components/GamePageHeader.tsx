import { memo } from "react";
import {
  AppShellMenu,
} from "../../../features/app-shell/AppShellMenu";
import { TtTokenAmount } from "../../../features/ui/TtToken";
import type { GamePageHeaderModel } from "../GamePage.types";
import styles from "../GamePage.module.css";
import { formatPhaseLabel } from "../gamePage.utils";

interface GamePageHeaderProps {
  model: GamePageHeaderModel;
}

function GamePageHeaderComponent({ model }: GamePageHeaderProps) {
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
    visibleTimelineTitle,
  } = model;
  const currentPlayer = currentPlayerId
    ? roomState.players.find((player) => player.id === currentPlayerId)
    : null;
  const showStatusTokenCount =
    roomState.settings.ttModeEnabled && currentPlayer !== null;

  return (
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
            <span className={`${styles.headerChip} ${styles.headerChipTurn}`}>
              Turn {roomState.turn?.turnNumber ?? "-"}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.headerAside}>
        <div className={styles.headerActionRow}>
          <div className={styles.statusBadge}>
            <span className={styles.statusBadgeTextGroup}>
              <span className={styles.statusBadgeDefault}>{statusBadgeText}</span>
              <span className={styles.statusBadgeTimeline}>
                {visibleTimelineTitle} · {visibleTimelineCardCount}{" "}
                card{visibleTimelineCardCount === 1 ? "" : "s"}
              </span>
            </span>
            {showStatusTokenCount ? (
              <span className={styles.statusBadgeTokenCount}>
                <TtTokenAmount amount={currentPlayer?.ttTokenCount ?? 0} />
              </span>
            ) : null}
          </div>
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
                    {roomState.settings.ttModeEnabled ? (
                      <>
                        {" · "}
                        <TtTokenAmount amount={player.ttTokenCount} />
                      </>
                    ) : null}
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
            subtitle="Manage visuals, match visibility, and local diagnostics during this game."
            tabs={menuTabs}
            title="TuneTrack"
            {...(roomState.hostId === currentPlayerId
              ? {
                  footerAction: {
                    label: "Close Room",
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
    previousModel.visibleTimelineTitle === nextModel.visibleTimelineTitle
  );
}

export const GamePageHeader = memo(
  GamePageHeaderComponent,
  (previousProps, nextProps) =>
    areHeaderModelsEqual(previousProps.model, nextProps.model),
);
