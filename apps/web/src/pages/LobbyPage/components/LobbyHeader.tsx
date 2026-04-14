import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { Badge } from "../../../features/ui/Badge";
import {
  getLobbyConnectionBadgeVariant,
  getLobbyHeaderMenuTabSpecs,
} from "../lobbyHeaderSelectors";
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
  const menuTabs = getLobbyHeaderMenuTabSpecs(isHost);

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
          variant={getLobbyConnectionBadgeVariant(connectionStatus)}
        >
          {connectionStatus}
        </Badge>
        <AppShellMenu
          subtitle="Grouped room, view, and developer controls live here."
          tabs={menuTabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            content: <p className={styles.menuPlaceholder}>{tab.message}</p>,
          }))}
          title="Lobby menu"
        />
      </div>
    </header>
  );
}
