import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { ActionButton } from "../../../features/ui/ActionButton";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { HomePageAssemblyProps } from "../HomePage.types";
import { HomePageHero } from "../components/HomePageHero";
import { HomePageTopBar } from "../components/HomePageTopBar";
import styles from "./HomePageDesktop.module.css";

export function HomePageDesktop({ controller }: HomePageAssemblyProps) {
  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
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
            <h2 className={styles.startTitle}>Play TuneTrack</h2>
            <p className={styles.startCopy}>
              Create a room as host or join an open room on the next screen.
            </p>
            <ActionButton
              className={styles.startButton}
              onClick={controller.handleStart}
              onFocus={controller.preloadLobby}
              onMouseEnter={controller.preloadLobby}
              onTouchStart={controller.preloadLobby}
              type="button"
            >
              Start
            </ActionButton>
          </section>
        </aside>
      </div>
    </AppPageShell>
  );
}
