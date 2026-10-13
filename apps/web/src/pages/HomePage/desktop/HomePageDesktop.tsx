import { useId } from "react";
import { useI18n } from "../../../features/i18n";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { Button } from "../../../features/ui/primitives";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { HomePageAssemblyProps } from "../HomePage.types";
import { HomePageHero } from "../components/HomePageHero";
import { HomePageTopBar } from "../components/HomePageTopBar";
import styles from "./HomePageDesktop.module.css";

export function HomePageDesktop({ controller }: HomePageAssemblyProps) {
  const { t } = useI18n();
  const startDescriptionId = useId();

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <HomePageTopBar />

      {controller.toastMessage ? (
        <StatusBanner className={styles.toast}>{controller.toastMessage}</StatusBanner>
      ) : null}

      <div className={styles.contentGrid}>
        <section className={styles.heroColumn}>
          <HomePageHero />
        </section>

        <aside className={styles.formColumn}>
          <section className={styles.startPanel}>
            <h2 className={styles.startTitle}>{t("home.desktop.title")}</h2>
            <p className={styles.startCopy} id={startDescriptionId}>
              {t("home.desktop.description")}
            </p>
            <Button
              aria-describedby={startDescriptionId}
              className={styles.startButton}
              fullWidth
              haptic
              onClick={controller.handleStart}
              onFocus={controller.preloadLobby}
              onMouseEnter={controller.preloadLobby}
              onTouchStart={controller.preloadLobby}
              size="lg"
              type="button"
            >
              {t("home.desktop.start")}
            </Button>
          </section>
        </aside>
      </div>
    </AppPageShell>
  );
}
