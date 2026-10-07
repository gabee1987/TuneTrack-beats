import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { ConnectionStatus } from "../../../features/rooms/ConnectionStatus";
import { getLobbyHeaderMenuTabSpecs } from "../lobbyHeaderSelectors";
import styles from "../lobbyPageStyles";

interface LobbyHeaderProps {
  isHost: boolean;
  roomId: string;
}

export function LobbyHeader({ isHost, roomId }: LobbyHeaderProps) {
  const { t } = useI18n();
  const menuTabs = getLobbyHeaderMenuTabSpecs(isHost);

  return (
    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.eyebrow}>{t("lobby.header.eyebrow")}</div>
        <h1 className={styles.title}>{roomId}</h1>
        <p className={styles.subtitle}>{t("lobby.header.subtitle")}</p>
      </div>

      <div className={styles.headerActions}>
        <ConnectionStatus />
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
