import type {
  HiddenCardMode,
  ThemeId,
  ViewPreferences,
} from "../../preferences/uiPreferences";
import type {
  AppShellMenuPreferencesState,
  AppShellMenuTab,
} from "../AppShellMenu.types";
import styles from "../AppShellMenu.module.css";

interface AppShellMenuPanelsProps {
  activeTab: AppShellMenuTab | null;
  preferencesState: AppShellMenuPreferencesState;
}

interface ToggleFieldProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  hint?: string;
}

interface SegmentedButtonProps<TValue extends string> {
  activeValue: TValue;
  label: string;
  onClick: (value: TValue) => void;
  value: TValue;
}

const viewPreferenceFields: Array<{
  key: keyof ViewPreferences;
  label: string;
  hint: string;
}> = [
  {
    key: "showMiniStandings",
    label: "Show mini standings",
    hint: "Keep the future top-3 strip ready without forcing it on.",
  },
  {
    key: "showHelperLabels",
    label: "Show helper labels",
    hint: "Keep small supporting labels visible while the final UI is evolving.",
  },
  {
    key: "showTimelineHints",
    label: "Show timeline hints",
    hint: "Helpful while we transition to the final timeline-first UX.",
  },
  {
    key: "showRoomCodeChip",
    label: "Show room code",
    hint: "Keep the room chip visible in the top bar when you need it.",
  },
  {
    key: "showPhaseChip",
    label: "Show phase",
    hint: "Show the current game phase as a compact top-bar chip.",
  },
  {
    key: "showTurnNumberChip",
    label: "Show turn number",
    hint: "Keep the current round number visible in the top bar.",
  },
];

const developerFields: Array<{
  key: keyof Pick<
    AppShellMenuPreferencesState,
    | "showDevAlbumInfo"
    | "showDevCardInfo"
    | "showDevGenreInfo"
    | "showDevYearInfo"
  >;
  label: string;
}> = [
  {
    key: "showDevCardInfo",
    label: "Song info",
  },
  {
    key: "showDevYearInfo",
    label: "Year",
  },
  {
    key: "showDevAlbumInfo",
    label: "Album info",
  },
  {
    key: "showDevGenreInfo",
    label: "Genre info",
  },
];

export function AppShellMenuPanels({
  activeTab,
  preferencesState,
}: AppShellMenuPanelsProps) {
  if (activeTab?.id === "view") {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>View preferences</h3>
        <p className={styles.sectionDescription}>
          Tune the amount of information you want to keep on screen.
        </p>
        <div className={styles.fieldGroup}>
          {viewPreferenceFields.map((field) => (
            <ToggleField
              checked={preferencesState.view[field.key]}
              hint={field.hint}
              key={field.key}
              label={field.label}
              onChange={(checked) =>
                preferencesState.updateViewPreferences({
                  [field.key]: checked,
                })
              }
            />
          ))}
        </div>
      </div>
    );
  }

  if (activeTab?.id === "settings") {
    return (
      <>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Theme</h3>
          <p className={styles.sectionDescription}>
            Choose the look you prefer on this device.
          </p>
          <div className={styles.segmentedRow}>
            <SegmentedButton
              activeValue={preferencesState.theme}
              label="Dark"
              onClick={preferencesState.setTheme}
              value="dark"
            />
            <SegmentedButton
              activeValue={preferencesState.theme}
              label="Light"
              onClick={preferencesState.setTheme}
              value="light"
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Hidden card style</h3>
          <p className={styles.sectionDescription}>
            Prepare how unrevealed cards should look in the final game shell.
          </p>
          <div className={styles.segmentedRow}>
            <SegmentedButton
              activeValue={preferencesState.hiddenCardMode}
              label="Artwork"
              onClick={preferencesState.setHiddenCardMode}
              value="artwork"
            />
            <SegmentedButton
              activeValue={preferencesState.hiddenCardMode}
              label="Gradient"
              onClick={preferencesState.setHiddenCardMode}
              value="gradient"
            />
          </div>
          <div className={styles.hiddenCardPreview}>
            <div
              className={`${styles.hiddenCardPreviewFace} ${
                preferencesState.hiddenCardMode === "gradient"
                  ? styles.hiddenCardPreviewGradient
                  : styles.hiddenCardPreviewArtwork
              }`}
            >
              <span className={styles.hiddenCardPreviewLabel}>
                Hidden card preview
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (activeTab?.id === "dev") {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Developer helpers</h3>
        <p className={styles.sectionDescription}>
          Keep these local to your browser while testing card states.
        </p>
        <div className={styles.fieldGroup}>
          {developerFields.map((field) => (
            <ToggleField
              checked={preferencesState[field.key]}
              key={field.key}
              label={field.label}
              onChange={(checked) =>
                preferencesState.setDevVisibility({
                  [field.key]: checked,
                })
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return activeTab?.content ?? null;
}

function ToggleField({
  checked,
  hint,
  label,
  onChange,
}: ToggleFieldProps) {
  return (
    <label className={styles.toggleField}>
      <div className={styles.toggleCopy}>
        <span className={styles.toggleLabel}>{label}</span>
        {hint ? <span className={styles.toggleHint}>{hint}</span> : null}
      </div>
      <input
        checked={checked}
        className={styles.checkbox}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function SegmentedButton<TValue extends ThemeId | HiddenCardMode>({
  activeValue,
  label,
  onClick,
  value,
}: SegmentedButtonProps<TValue>) {
  return (
    <button
      className={`${styles.segmentedButton} ${
        activeValue === value ? styles.segmentedButtonActive : ""
      }`}
      onClick={() => onClick(value)}
      type="button"
    >
      {label}
    </button>
  );
}
