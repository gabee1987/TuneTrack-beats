import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
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
          <img className={styles.brandLogo} src="/logo.png" alt="TuneTrack Beats" />
          {/* <p className={styles.eyebrow}>Party music timeline game</p> */}
        </header>

        <section className={styles.previewCard} aria-label={t("home.mobilePreviewLabel")}>
          <div className={styles.featureList}>
            <article className={styles.featureCard}>
              <span className={styles.featureStep}>01</span>
              <h3>{t("home.featureGuessTitle")}</h3>
              <p>{t("home.featureGuessDescription")}</p>
            </article>

            <article className={styles.featureCard}>
              <span className={styles.featureStep}>02</span>
              <h3>{t("home.featurePlaceTitle")}</h3>
              <p>{t("home.featurePlaceDescription")}</p>
            </article>

            <article className={styles.featureCard}>
              <span className={styles.featureStep}>03</span>
              <h3>{t("home.featureChallengeTitle")}</h3>
              <p>{t("home.featureChallengeDescription")}</p>
            </article>
          </div>
        </section>

        <div className={styles.actionZone}>
          <button
            className={styles.primaryAction}
            onClick={controller.handleQuickStart}
            onFocus={controller.preloadLobby}
            onMouseEnter={controller.preloadLobby}
            onTouchStart={controller.preloadLobby}
            type="button"
          >
            <span className={styles.primaryActionInner}>
              <span className={styles.primaryActionLabel}>{t("home.primaryAction")}</span>
            </span>
          </button>
        </div>
      </div>
    </AppPageShell>
  );
}
