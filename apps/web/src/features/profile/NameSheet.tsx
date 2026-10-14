import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from "@tunetrack/shared/client";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import { Button, Dialog, TextField } from "../ui/primitives";
import styles from "./NameSheet.module.css";

export interface NameSheetProps {
  initialName: string;
  isOpen: boolean;
  onClose: () => void;
  onClosed?: (() => void) | undefined;
  /** Receives the trimmed name; the caller saves it and closes the sheet. */
  onSave: (displayName: string) => void;
}

/**
 * Asks for the one personal datum the app needs, in place (`22` §4.2): opened before a first
 * Host or Join and by every "Change". The server makes a taken name unique in the room, so the
 * sheet never checks for duplicates.
 */
export function NameSheet({ initialName, isOpen, onClose, onClosed, onSave }: NameSheetProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initialName);
  const trimmed = draft.trim();
  const canContinue = trimmed.length >= PLAYER_NAME_MIN_LENGTH;
  const formId = useId();

  useEffect(() => {
    if (isOpen) setDraft(initialName);
  }, [initialName, isOpen]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canContinue) onSave(trimmed);
  }

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onClose} variant="ghost">
            {t("common.cancel")}
          </Button>
          <Button disabled={!canContinue} form={formId} haptic type="submit">
            {t("profile.name.continue")}
          </Button>
        </>
      }
      closeLabel={t("common.close")}
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
      title={t("profile.name.title")}
    >
      <form className={styles.form} id={formId} onSubmit={handleSubmit}>
        <p className={styles.body}>{t("profile.name.body")}</p>
        <TextField
          autoCapitalize="words"
          autoComplete="nickname"
          data-autofocus
          enterKeyHint="done"
          label={t("profile.name.label")}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
      </form>
    </Dialog>
  );
}
