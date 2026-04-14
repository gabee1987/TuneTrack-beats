import { AppShellMenu } from "../../features/app-shell/AppShellMenu";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { HomePageHero } from "./components/HomePageHero";
import { JoinRoomForm } from "./components/JoinRoomForm";
import { useHomePageController } from "./hooks/useHomePageController";
import styles from "./HomePage.module.css";

export function HomePage() {
  const {
    displayName,
    handleSubmit,
    roomId,
    setDisplayName,
    setRoomId,
  } = useHomePageController();

  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
        <div className={styles.topBar}>
          <div className={styles.topBarCopy}>
            <span className={styles.topBarLabel}>TuneTrack</span>
            <span className={styles.topBarMeta}>
              Guess tracks. Challenge friends. Build the timeline.
            </span>
          </div>

          <AppShellMenu
            subtitle="Local preferences and future app controls live here."
            tabs={[
              {
                id: "view",
                label: "View",
                content: (
                  <p className={styles.menuPlaceholder}>
                    Gameplay visibility controls will appear here as the final
                    mobile shell takes shape.
                  </p>
                ),
              },
              {
                id: "settings",
                label: "Settings",
                content: (
                  <p className={styles.menuPlaceholder}>
                    Theme and hidden-card preferences are ready for testing now.
                  </p>
                ),
              },
            ]}
            title="TuneTrack menu"
          />
        </div>

        <div className={styles.contentGrid}>
          <HomePageHero />
          <JoinRoomForm
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onRoomIdChange={setRoomId}
            onSubmit={handleSubmit}
            roomId={roomId}
          />
        </div>
    </AppPageShell>
  );
}
