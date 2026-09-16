import { PLAYER_NAME_MAX_LENGTH } from "@tunetrack/shared";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useI18n } from "../i18n";
import { TextInput } from "../ui/TextInput";
import styles from "./PlayerNameField.module.css";

interface PlayerNameFieldProps {
  disabled?: boolean;
  displayName: string;
  onSave: (displayName: string) => void;
}

export function PlayerNameField({ disabled = false, displayName, onSave }: PlayerNameFieldProps) {
  const { t } = useI18n();
  const inputId = useId();
  const [draftDisplayName, setDraftDisplayName] = useState(displayName);
  const trimmedDisplayName = draftDisplayName.trim();
  const canSave = !disabled && Boolean(trimmedDisplayName) && trimmedDisplayName !== displayName;

  useEffect(() => {
    setDraftDisplayName(displayName);
  }, [displayName]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    onSave(trimmedDisplayName);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor={inputId}>
        {t("profile.nameLabel")}
      </label>
      <div className={styles.fieldRow}>
        <TextInput
          autoComplete="nickname"
          className={styles.input}
          disabled={disabled}
          id={inputId}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          onChange={(event) => setDraftDisplayName(event.target.value)}
          placeholder={t("profile.defaultName")}
          value={draftDisplayName}
        />
        <button
          aria-label={t("profile.saveAction")}
          className={styles.saveButton}
          disabled={!canSave}
          type="submit"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path
              d="m5 12 4 4L19 6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
