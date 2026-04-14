import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import styles from "../HomePage.module.css";

export function HomePageTopBar() {
  return (
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
  );
}
