import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../features/i18n";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { StatusBanner } from "../../features/ui/StatusBanner";
import { TextInput } from "../../features/ui/TextInput";
import { Button, Skeleton } from "../../features/ui/primitives";
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
          <div className={styles.loadingFacts} aria-busy="true" aria-live="polite">
            <Skeleton height={72} width="100%" />
            <Skeleton height={72} width="100%" />
            <span className={styles.srOnly}>{t("joinRoom.loading")}</span>
          </div>
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

          <Button disabled={!room} fullWidth haptic size="lg" type="submit">
            {t("joinRoom.joinAction")}
          </Button>
        </form>
      </section>
    </AppPageShell>
  );
}
