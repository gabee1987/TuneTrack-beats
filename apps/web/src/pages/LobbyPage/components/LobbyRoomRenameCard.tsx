import { type FormEvent, useEffect, useId, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { TextInput } from "../../../features/ui/TextInput";
import { Button } from "../../../features/ui/primitives";
import type { LobbyAssemblyModel } from "../hooks/buildLobbyAssemblyModel";
import { isValidRoomName } from "../lobbyRoomName";
import styles from "./LobbyRoomRenameCard.module.css";

interface LobbyRoomRenameCardProps {
  actionState: LobbyAssemblyModel["identity"]["identityActionState"];
  isPending: boolean;
  onRename: (nextRoomId: string) => Promise<boolean>;
  roomId: string;
}

/** Desktop counterpart of the mobile room-name field: the host renames the room in the lobby. */
export function LobbyRoomRenameCard({
  actionState,
  isPending,
  onRename,
  roomId,
}: LobbyRoomRenameCardProps) {
  const { t } = useI18n();
  const inputId = useId();
  const hintId = useId();
  const [draftRoomId, setDraftRoomId] = useState(roomId);

  useEffect(() => {
    setDraftRoomId(roomId);
  }, [roomId]);

  const trimmedRoomId = draftRoomId.trim();
  const isRoomIdValid = isValidRoomName(trimmedRoomId);
  const canRename = Boolean(trimmedRoomId) && isRoomIdValid && trimmedRoomId !== roomId;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRename || isPending) return;
    void onRename(trimmedRoomId);
  }

  let buttonLabel = t("lobby.rename.submit");
  if (actionState?.kind === "rename" && actionState.status === "retrying") {
    buttonLabel = t("lobby.setup.applyRetrying");
  } else if (actionState?.kind === "rename" && actionState.status === "failed") {
    buttonLabel = t("lobby.setup.retryApply");
  }

  return (
    <SurfaceCard className={styles.card}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor={inputId}>
          {t("lobby.setup.roomName")}
        </label>
        <p className={styles.hint} id={hintId}>
          {t("lobby.setup.roomNameInfoBody")}
        </p>
        <div className={styles.row}>
          <TextInput
            aria-describedby={hintId}
            autoCapitalize="none"
            autoComplete="off"
            disabled={isPending}
            id={inputId}
            maxLength={24}
            onChange={(event) => setDraftRoomId(event.target.value)}
            placeholder={t("lobby.setup.roomNamePlaceholder")}
            value={draftRoomId}
          />
          <Button disabled={!canRename || isPending} type="submit" variant="secondary">
            {buttonLabel}
          </Button>
        </div>
        {!isRoomIdValid && trimmedRoomId ? (
          <span className={styles.error}>{t("lobby.setup.roomNameInvalid")}</span>
        ) : null}
      </form>
    </SurfaceCard>
  );
}
