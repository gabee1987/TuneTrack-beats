import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import { Button } from "../../../features/ui/primitives";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { HomePageAssemblyProps } from "../HomePage.types";
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
          <img alt="TuneTrack Beats" className={styles.brandLogo} src="/logo.png" />
          <p className={styles.tagline}>{t("home.roomEntryDescription")}</p>
        </header>

        <section aria-label={t("home.mobilePreviewLabel")} className={styles.featureList}>
          <article className={styles.featureCard}>
            <span className={styles.featureStep}>01</span>
            <div className={styles.featureCopy}>
              <h3 className={styles.featureTitle}>{t("home.featureGuessTitle")}</h3>
              <p className={styles.featureDescription}>{t("home.featureGuessDescription")}</p>
            </div>
          </article>

          <article className={styles.featureCard}>
            <span className={styles.featureStep}>02</span>
            <div className={styles.featureCopy}>
              <h3 className={styles.featureTitle}>{t("home.featurePlaceTitle")}</h3>
              <p className={styles.featureDescription}>{t("home.featurePlaceDescription")}</p>
            </div>
          </article>

          <article className={styles.featureCard}>
            <span className={styles.featureStep}>03</span>
            <div className={styles.featureCopy}>
              <h3 className={styles.featureTitle}>{t("home.featureChallengeTitle")}</h3>
              <p className={styles.featureDescription}>{t("home.featureChallengeDescription")}</p>
            </div>
          </article>
        </section>

        <div className={styles.actionZone}>
          <Button
            fullWidth
            haptic
            onClick={controller.handleStart}
            onFocus={controller.preloadLobby}
            onMouseEnter={controller.preloadLobby}
            onTouchStart={controller.preloadLobby}
            size="lg"
            type="button"
          >
            {t("home.primaryAction")}
          </Button>
        </div>
      </div>
    </AppPageShell>
  );
}
