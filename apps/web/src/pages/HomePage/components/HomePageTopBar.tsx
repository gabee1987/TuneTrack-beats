import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import { getHomePageMenuTabSpecs } from "../homePageMenuConfig";
import styles from "../HomePage.module.css";

export function HomePageTopBar() {
  const menuTabs = getHomePageMenuTabSpecs();

  return (
    <div className={styles.topBar}>
      <div className={styles.topBarCopy}>
        <span className={styles.topBarLabel}>TuneTrack</span>
        <span className={styles.topBarMeta}>
          Guess tracks. Challenge friends. Build the timeline.
        </span>
      </div>

      <AppShellMenu
        subtitle="Choose your theme, view options, and local interface preferences."
        tabs={menuTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          content: <p className={styles.menuPlaceholder}>{tab.message}</p>,
        }))}
        title="TuneTrack"
      />
    </div>
  );
}
