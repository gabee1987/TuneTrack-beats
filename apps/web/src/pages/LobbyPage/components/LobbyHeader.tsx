import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { Badge } from "../../../features/ui/Badge";
import styles from "../LobbyPage.module.css";

interface LobbyHeaderProps {
  connectionStatus: string;
  isHost: boolean;
  roomId: string;
}

export function LobbyHeader({
  connectionStatus,
  isHost,
  roomId,
}: LobbyHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.eyebrow}>Lobby</div>
        <h1 className={styles.title}>{roomId}</h1>
        <p className={styles.subtitle}>
          Check the players, adjust the rules, and start when everyone is in.
        </p>
      </div>

      <div className={styles.headerActions}>
        <Badge
          size="md"
          variant={
            connectionStatus === "Connected" ? "connected" : "mutedSurface"
          }
        >
          {connectionStatus}
        </Badge>
        <AppShellMenu
          subtitle="Grouped room, view, and developer controls live here."
          tabs={[
            {
              id: "players",
              label: "Players",
              content: (
                <p className={styles.menuPlaceholder}>
                  The player roster remains on the main screen for faster access on
                  mobile.
                </p>
              ),
            },
            {
              id: "view",
              label: "View",
              content: (
                <p className={styles.menuPlaceholder}>
                  Local visibility toggles stay available without crowding the lobby.
                </p>
              ),
            },
            {
              id: "settings",
              label: "Settings",
              content: (
                <p className={styles.menuPlaceholder}>
                  Theme and hidden-card preferences remain device-local.
                </p>
              ),
            },
            ...(isHost
              ? [
                  {
                    id: "host" as const,
                    label: "Host",
                    content: (
                      <p className={styles.menuPlaceholder}>
                        Core host room setup now stays on the main lobby surface.
                      </p>
                    ),
                  },
                  {
                    id: "dev" as const,
                    label: "Dev",
                    content: (
                      <p className={styles.menuPlaceholder}>
                        Developer-only host tools continue to live behind the shared menu.
                      </p>
                    ),
                  },
                ]
              : []),
          ]}
          title="Lobby menu"
        />
      </div>
    </header>
  );
}
