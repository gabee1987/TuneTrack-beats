import type { ViewPreferences } from "../../preferences/uiPreferences";
import type { AppShellMenuPreferencesState, AppShellMenuTab } from "../AppShellMenu.types";
import { useI18n } from "../../i18n";
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
}> = [
  { key: "showMiniStandings" },
  { key: "showHelperLabels" },
  { key: "showTimelineHints" },
  { key: "showRoomCodeChip" },
  { key: "showPhaseChip" },
  { key: "showTurnNumberChip" },
];

const developerFields: Array<{
  key: keyof Pick<
    AppShellMenuPreferencesState,
    "showDevAlbumInfo" | "showDevCardInfo" | "showDevGenreInfo" | "showDevYearInfo"
  >;
}> = [
  { key: "showDevCardInfo" },
  { key: "showDevYearInfo" },
  { key: "showDevAlbumInfo" },
  { key: "showDevGenreInfo" },
];

export function AppShellMenuPanels({ activeTab, preferencesState }: AppShellMenuPanelsProps) {
  const { availableLanguages, languageId, setLanguage, t } = useI18n();

  if (activeTab?.id === "language") {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("appShell.menu.languageTitle")}</h3>
        <p className={styles.sectionDescription}>{t("appShell.menu.languageDescription")}</p>
        <div className={styles.segmentedRow}>
          {availableLanguages.map((language) => (
            <SegmentedButton
              activeValue={languageId}
              key={language.id}
              label={language.nativeName}
              onClick={setLanguage}
              value={language.id}
            />
          ))}
        </div>
      </div>
    );
  }

  if (activeTab?.id === "view") {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("appShell.menu.viewTitle")}</h3>
        <p className={styles.sectionDescription}>{t("appShell.menu.viewDescription")}</p>
        <div className={styles.fieldGroup}>
          {viewPreferenceFields.map((field) => {
            const label = t(`appShell.viewPreferences.${field.key}.label`);
            return (
              <ToggleField
                checked={preferencesState.view[field.key]}
                hint={t(`appShell.viewPreferences.${field.key}.hint`)}
                key={field.key}
                label={label}
                onChange={(checked) =>
                  preferencesState.updateViewPreferences({
                    [field.key]: checked,
                  })
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (activeTab?.id === "settings") {
    return (
      <>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("appShell.menu.themeTitle")}</h3>
          <p className={styles.sectionDescription}>{t("appShell.menu.themeDescription")}</p>
          <div className={styles.segmentedRow}>
            <SegmentedButton
              activeValue={preferencesState.theme}
              label={t("appShell.menu.themeDark")}
              onClick={preferencesState.setTheme}
              value="dark"
            />
            <SegmentedButton
              activeValue={preferencesState.theme}
              label={t("appShell.menu.themeLight")}
              onClick={preferencesState.setTheme}
              value="light"
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("appShell.menu.hiddenCardTitle")}</h3>
          <p className={styles.sectionDescription}>{t("appShell.menu.hiddenCardDescription")}</p>
          <div className={styles.segmentedRow}>
            <SegmentedButton
              activeValue={preferencesState.hiddenCardMode}
              label={t("appShell.menu.hiddenCardArtwork")}
              onClick={preferencesState.setHiddenCardMode}
              value="artwork"
            />
            <SegmentedButton
              activeValue={preferencesState.hiddenCardMode}
              label={t("appShell.menu.hiddenCardGradient")}
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
                {t("appShell.menu.hiddenCardPreview")}
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
        <h3 className={styles.sectionTitle}>{t("appShell.menu.developerTitle")}</h3>
        <p className={styles.sectionDescription}>{t("appShell.menu.developerDescription")}</p>
        <div className={styles.fieldGroup}>
          {developerFields.map((field) => {
            const label = t(`appShell.developerPreferences.${field.key}.label`);
            return (
              <ToggleField
                checked={preferencesState[field.key]}
                hint={t(`appShell.developerPreferences.${field.key}.hint`)}
                key={field.key}
                label={label}
                onChange={(checked) =>
                  preferencesState.setDevVisibility({
                    [field.key]: checked,
                  })
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  return activeTab?.content ?? null;
}

function ToggleField({ checked, hint, label, onChange }: ToggleFieldProps) {
  const { t } = useI18n();

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
        offLabel={t("common.off")}
        onLabel={t("common.on")}
        size="compact"
      />
    </label>
  );
}

function SegmentedButton<TValue extends string>({
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
