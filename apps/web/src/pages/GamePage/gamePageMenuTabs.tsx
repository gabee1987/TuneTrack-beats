import type { PublicRoomState } from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import {
  TtTokenAmount,
  TtTokenIcon,
} from "../../features/ui/TtToken";
import styles from "./GamePage.module.css";

interface CreateGameMenuTabsOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState;
  onAwardTt: (playerId: string) => void;
  onCloseRoom: () => void;
}

export function createGameMenuTabs({
  currentPlayerId,
  roomState,
  onAwardTt,
  onCloseRoom,
}: CreateGameMenuTabsOptions): AppShellMenuTab[] {
  return [
    {
      id: "players",
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
                    {roomState.settings.ttModeEnabled ? (
                      <>
                        {" · "}
                        <TtTokenAmount amount={player.ttTokenCount} />
                      </>
                    ) : null}
                    {player.isHost ? " · Host" : ""}
                    {player.id === roomState.turn?.activePlayerId ? " · Turn" : ""}
                  </p>
                </div>
                {roomState.settings.ttModeEnabled &&
                roomState.hostId === currentPlayerId ? (
                  <button
                    className={styles.menuActionButton}
                    onClick={() => onAwardTt(player.id)}
                    type="button"
                  >
                    +<TtTokenIcon className={styles.menuTokenIcon} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "view",
      label: "View",
      content: (
        <p className={styles.menuPlaceholder}>
          Timeline visibility preferences now live inside the shared menu shell.
        </p>
      ),
    },
    {
      id: "settings",
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
                  onClick={onCloseRoom}
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
}
