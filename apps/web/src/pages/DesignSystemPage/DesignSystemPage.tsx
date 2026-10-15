import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { useUiPreferencesStore } from "../../features/preferences/uiPreferences";
import { SegmentedControl } from "../../features/ui/primitives";
import { ControlsGallery } from "./ControlsGallery";
import { CorePrimitivesGallery } from "./CorePrimitivesGallery";
import { FeedbackGallery } from "./FeedbackGallery";
import { LobbyGallery } from "./LobbyGallery";
import { ProfileGallery } from "./ProfileGallery";
import { RulesGallery } from "./RulesGallery";
import { StartupFlowPrimitivesGallery } from "./StartupFlowPrimitivesGallery";
import styles from "./DesignSystemPage.module.css";

type ThemeChoice = "dark" | "light";

/**
 * Development-only gallery of every shared UI element in every variant and state, kept so
 * any of them can be inspected and adjusted in one place (owner request 2026-10-14). A new or
 * changed shared component is added here in the same change.
 */
export function DesignSystemPage() {
  const theme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);

  return (
    <AppPageShell panelClassName={styles.panel} screenClassName={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>DEV ONLY</p>
        <h1 className={`typeTitleLg ${styles.heading}`}>Design system</h1>
        <p className="typeBody">
          Every shared UI element in every variant and state. Not linked from production navigation.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Theme</h2>
        <SegmentedControl<ThemeChoice>
          aria-label="Theme"
          onChange={setTheme}
          options={[
            { label: "Dark", value: "dark" },
            { label: "Light", value: "light" },
          ]}
          value={theme}
        />
      </section>

      <h2 className={styles.groupTitle}>Primitives</h2>
      <CorePrimitivesGallery />
      <StartupFlowPrimitivesGallery />

      <h2 className={styles.groupTitle}>Profile</h2>
      <ProfileGallery />

      <h2 className={styles.groupTitle}>Lobby</h2>
      <LobbyGallery />
      <RulesGallery />

      <h2 className={styles.groupTitle}>Feedback & game</h2>
      <FeedbackGallery />

      <h2 className={styles.groupTitle}>Controls</h2>
      <ControlsGallery />
    </AppPageShell>
  );
}
