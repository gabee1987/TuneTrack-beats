import { ROOM_CODE_MAX_LENGTH } from "@tunetrack/shared/client";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useI18n } from "../../../features/i18n";
import { isValidRoomName } from "../../../features/rooms/roomCode";
import { Button, Dialog, TextField } from "../../../features/ui/primitives";
import type { LobbyIdentityActionState } from "../LobbyPage.types";
import styles from "./RoomRenameDialog.module.css";

interface RoomRenameDialogProps {
  actionState: LobbyIdentityActionState | null;
  currentCode: string;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onRename: (nextCode: string) => Promise<boolean>;
}

/** The host changes the room code (`04` §3.3.1); codes match in any case, so case alone is no change. */
export function RoomRenameDialog({
  actionState,
  currentCode,
  isOpen,
  isPending,
  onClose,
  onRename,
}: RoomRenameDialogProps) {
  const { t } = useI18n();
  const formId = useId();
  const [draft, setDraft] = useState(currentCode);
  const trimmed = draft.trim();
  const error = getRenameError(trimmed, currentCode);
  const canSave = Boolean(trimmed) && !error && trimmed !== currentCode && !isPending;

  useEffect(() => {
    if (isOpen) setDraft(currentCode);
  }, [currentCode, isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (await onRename(trimmed)) onClose();
  }

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onClose} variant="ghost">
            {t("common.cancel")}
          </Button>
          <Button disabled={!canSave} form={formId} haptic type="submit">
            {getSubmitLabel(actionState, t)}
          </Button>
        </>
      }
      closeLabel={t("common.close")}
      isOpen={isOpen}
      onClose={onClose}
      title={t("lobby.rename.title")}
    >
      <form className={styles.form} id={formId} onSubmit={(event) => void handleSubmit(event)}>
        <TextField
          appearance="code"
          autoCapitalize="none"
          autoComplete="off"
          data-autofocus
          enterKeyHint="done"
          error={error ? t(error) : null}
          helper={t("lobby.rename.helper")}
          label={t("lobby.invite.label")}
          maxLength={ROOM_CODE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          value={draft}
        />
      </form>
    </Dialog>
  );
}

function getRenameError(trimmed: string, currentCode: string): string | null {
  if (!trimmed) return null;
  if (!isValidRoomName(trimmed)) return "lobby.rename.invalid";
  if (trimmed !== currentCode && trimmed.toLowerCase() === currentCode.toLowerCase()) {
    return "lobby.rename.caseOnly";
  }
  return null;
}

function getSubmitLabel(
  actionState: LobbyIdentityActionState | null,
  t: (key: string) => string,
): string {
  if (actionState?.kind !== "rename") return t("lobby.rename.submit");
  switch (actionState.status) {
    case "pending":
      return t("lobby.rename.pending");
    case "retrying":
      return t("lobby.rename.retrying");
    case "failed":
      return t("lobby.rename.retry");
  }
}
