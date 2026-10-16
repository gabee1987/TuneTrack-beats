import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { getLobbyHeaderMenuTabSpecs } from "../lobbyHeaderSelectors";
import styles from "./LobbyAppMenu.module.css";

/** The desktop lobby's app menu: language, view and the host's diagnostics. */
export function LobbyAppMenu({ isHost }: { isHost: boolean }) {
  const { t } = useI18n();

  return (
    <AppShellMenu
      subtitle={t("lobby.header.menuSubtitle")}
      tabs={getLobbyHeaderMenuTabSpecs(isHost).map((tab) => ({
        id: tab.id,
        label: t(tab.labelKey),
        content: tab.messageKey ? (
          <p className={styles.menuPlaceholder}>{t(tab.messageKey)}</p>
        ) : null,
      }))}
      title={t("app.name")}
    />
  );
}
