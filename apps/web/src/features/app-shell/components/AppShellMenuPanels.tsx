import type {
  HiddenCardMode,
  ThemeId,
  ViewPreferences,
} from "../../preferences/uiPreferences";
import type {
  AppShellMenuPreferencesState,
  AppShellMenuTab,
} from "../AppShellMenu.types";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
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
    label: "Mini standings strip",
    hint: "Keep the live top-three race visible in the header.",
  },
  {
    key: "showHelperLabels",
    label: "Interface helper labels",
    hint: "Display supporting labels for faster in-match readability.",
  },
  {
    key: "showTimelineHints",
    label: "Timeline callout hints",
    hint: "Surface contextual timeline guidance during active play.",
  },
  {
    key: "showRoomCodeChip",
    label: "Room code chip",
    hint: "Show a compact room identifier in the top status rail.",
  },
  {
    key: "showPhaseChip",
    label: "Phase chip",
    hint: "Track the current phase with a compact status indicator.",
  },
  {
    key: "showTurnNumberChip",
    label: "Turn counter chip",
    hint: "Keep the active turn number visible in the top bar.",
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
  hint: string;
}> = [
  {
    key: "showDevCardInfo",
    label: "Track metadata overlay",
    hint: "Reveal title and artist details on hidden cards for QA sessions.",
  },
  {
    key: "showDevYearInfo",
    label: "Release year tag",
    hint: "Show the release year directly on card faces.",
  },
  {
    key: "showDevAlbumInfo",
    label: "Album tag",
    hint: "Display album details as an additional inspection layer.",
  },
  {
    key: "showDevGenreInfo",
    label: "Genre tag",
    hint: "Expose genre labels for balancing and content checks.",
  },
];

export function AppShellMenuPanels({
  activeTab,
  preferencesState,
}: AppShellMenuPanelsProps) {
  if (activeTab?.id === "view") {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>View layout controls</h3>
        <p className={styles.sectionDescription}>
          Fine tune match information density for this device.
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
          <h3 className={styles.sectionTitle}>Theme mode</h3>
          <p className={styles.sectionDescription}>
            Choose the visual identity you want to play with.
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
            Pick how unrevealed cards are rendered in-match.
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
        <h3 className={styles.sectionTitle}>Developer diagnostics</h3>
        <p className={styles.sectionDescription}>
          Local debug overlays for validating hidden-card and timeline states.
        </p>
        <div className={styles.fieldGroup}>
          {developerFields.map((field) => (
            <ToggleField
              checked={preferencesState[field.key]}
              hint={field.hint}
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
      <ToggleSwitch
        ariaLabel={label}
        checked={checked}
        className={styles.toggleSwitch}
        onChange={onChange}
        size="compact"
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
