import type { PublicRoomState } from "@tunetrack/shared";
import {
  AppShellMenu,
} from "../../../features/app-shell/AppShellMenu";
import type { GamePageController } from "../GamePage.types";
import styles from "../GamePage.module.css";
import { formatPhaseLabel } from "../gamePage.utils";

interface GamePageHeaderProps
  extends Pick<
    GamePageController,
    | "currentPlayerId"
    | "leadingPlayers"
    | "menuTabs"
    | "showMiniStandings"
    | "showPhaseChip"
    | "showRoomCodeChip"
    | "showTimelineHints"
    | "showTurnNumberChip"
    | "statusBadgeText"
    | "statusDetailText"
    | "updateViewPreferences"
  > {
  roomState: PublicRoomState;
}

export function GamePageHeader({
  currentPlayerId,
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
}: GamePageHeaderProps) {
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
  );
}
