import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { HomePageAssemblyProps } from "../HomePage.types";
import { HomeActions } from "../components/HomeActions";
import { getHomePageMenuTabSpecs } from "../homePageMenuConfig";
import { AnimatedMenuBackground } from "./AnimatedMenuBackground";
import styles from "./HomePageMobile.module.css";

export function HomePageMobile({ controller }: HomePageAssemblyProps) {
  const { t } = useI18n();
  const menuTabs = getHomePageMenuTabSpecs();

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <AnimatedMenuBackground />

      <div className={styles.content}>
        {controller.toastMessage ? (
          <StatusBanner className={styles.toast}>{controller.toastMessage}</StatusBanner>
        ) : null}

        <div className={styles.menuAnchor}>
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

        <header className={styles.hero}>
          <img alt={t("app.name")} className={styles.brandLogo} src="/logo.png" />
          <p className={styles.tagline}>{t("home.tagline")}</p>
        </header>

        <div className={styles.actionZone}>
          <HomeActions controller={controller} />
        </div>
      </div>
    </AppPageShell>
  );
}
