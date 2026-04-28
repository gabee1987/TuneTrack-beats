import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { getHomePageMenuTabSpecs } from "../homePageMenuConfig";
import styles from "../HomePage.module.css";

export function HomePageTopBar() {
  const { t } = useI18n();
  const menuTabs = getHomePageMenuTabSpecs();

  return (
    <div className={styles.topBar}>
      <div className={styles.topBarCopy}>
        <span className={styles.topBarLabel}>{t("home.topBarLabel")}</span>
        <span className={styles.topBarMeta}>{t("home.topBarMeta")}</span>
      </div>

      <AppShellMenu
        subtitle={t("home.menuSubtitle")}
        tabs={menuTabs.map((tab) => ({
          id: tab.id,
          label: t(tab.labelKey),
          content: tab.messageKey ? (
            <p className={styles.menuPlaceholder}>{t(tab.messageKey)}</p>
          ) : null,
        }))}
        title={t("home.menuTitle")}
      />
    </div>
  );
}
