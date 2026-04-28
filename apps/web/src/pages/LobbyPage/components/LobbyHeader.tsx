import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
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

export function LobbyHeader({ connectionStatus, isHost, roomId }: LobbyHeaderProps) {
  const { t } = useI18n();
  const menuTabs = getLobbyHeaderMenuTabSpecs(isHost);
  const localizedConnectionStatus =
    connectionStatus === "Connected"
      ? t("lobby.connection.connected")
      : connectionStatus === "Connecting"
        ? t("lobby.connection.connecting")
        : connectionStatus === "Disconnected"
          ? t("lobby.connection.disconnected")
          : connectionStatus;

  return (
    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.eyebrow}>{t("lobby.header.eyebrow")}</div>
        <h1 className={styles.title}>{roomId}</h1>
        <p className={styles.subtitle}>{t("lobby.header.subtitle")}</p>
      </div>

      <div className={styles.headerActions}>
        <Badge size="md" variant={getLobbyConnectionBadgeVariant(connectionStatus)}>
          {localizedConnectionStatus}
        </Badge>
        <AppShellMenu
          subtitle={t("lobby.header.menuSubtitle")}
          tabs={menuTabs.map((tab) => ({
            id: tab.id,
            label: t(tab.labelKey),
            content: tab.messageKey ? (
              <p className={styles.menuPlaceholder}>{t(tab.messageKey)}</p>
            ) : null,
          }))}
          title="TuneTrack"
        />
      </div>
    </header>
  );
}
