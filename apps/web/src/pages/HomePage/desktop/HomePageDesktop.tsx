import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { HomePageAssemblyProps } from "../HomePage.types";
import { HomePageHero } from "../components/HomePageHero";
import { JoinRoomForm } from "../components/JoinRoomForm";
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
          <JoinRoomForm
            displayName={controller.displayName}
            onIntentToSubmit={controller.preloadLobby}
            onDisplayNameChange={controller.setDisplayName}
            onRoomIdChange={controller.setRoomId}
            onSubmit={controller.handleSubmit}
            roomId={controller.roomId}
          />
        </aside>
      </div>
    </AppPageShell>
  );
}
