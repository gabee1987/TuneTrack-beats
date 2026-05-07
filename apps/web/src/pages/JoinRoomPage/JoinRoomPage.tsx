import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../features/i18n";
import { ActionButton } from "../../features/ui/ActionButton";
import { StatusBanner } from "../../features/ui/StatusBanner";
import { TextInput } from "../../features/ui/TextInput";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { rememberPlayerDisplayName } from "../../services/session/playerSession";
import { buildInviteJoinPath, DEFAULT_DISPLAY_NAME } from "../HomePage/homePageNavigation";
import { useJoinRoomPreview } from "./hooks/useJoinRoomPreview";
import styles from "./JoinRoomPage.module.css";

export function JoinRoomPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const { room, status } = useJoinRoomPreview(roomId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomId) return;

    const targetPath = buildInviteJoinPath(roomId, displayName);
    if (!targetPath) return;

    rememberPlayerDisplayName(displayName.trim());
    navigate(targetPath);
  }

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{t("joinRoom.eyebrow")}</p>
        <h1 className={styles.title}>{roomId}</h1>

        {status === "loading" ? (
          <StatusBanner>{t("joinRoom.loading")}</StatusBanner>
        ) : room ? (
          <div className={styles.roomFacts}>
            <span>
              <strong>{room.hostName}</strong>
              {t("joinRoom.hostLabel")}
            </span>
            <span>
              <strong>{room.playerCount}</strong>
              {t("joinRoom.playersLabel")}
            </span>
          </div>
        ) : (
          <StatusBanner>{t("joinRoom.notFound")}</StatusBanner>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>{t("home.playerNameLabel")}</span>
            <TextInput
              maxLength={24}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>

          <ActionButton disabled={!room} type="submit">
            {t("joinRoom.joinAction")}
          </ActionButton>
        </form>
      </section>
    </AppPageShell>
  );
}
