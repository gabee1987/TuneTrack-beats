import { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { preloadLobbyRuntime } from "../../app/preloadRoutes";
import { useI18n } from "../../features/i18n";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { IdentityChip } from "../../features/profile/IdentityChip";
import { NameSheet } from "../../features/profile/NameSheet";
import { useNameGate } from "../../features/profile/useNameGate";
import { buildInviteJoinPath } from "../../features/rooms/roomNavigation";
import { StatusBanner } from "../../features/ui/StatusBanner";
import { Button, Skeleton } from "../../features/ui/primitives";
import { useJoinRoomPreview } from "./hooks/useJoinRoomPreview";
import styles from "./JoinRoomPage.module.css";

export function JoinRoomPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const nameGate = useNameGate();
  const { room, status } = useJoinRoomPreview(roomId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) return;

    // The stored code, so an invite typed in another case lands on the room's own URL.
    const targetPath = buildInviteJoinPath(room.roomId);
    if (!targetPath) return;

    nameGate.requireName(() => {
      preloadLobbyRuntime();
      navigate(targetPath);
    });
  }

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{t("joinRoom.eyebrow")}</p>
        <h1 className={styles.title}>{room?.roomId ?? roomId}</h1>

        {status === "loading" ? (
          <div
            className={styles.roomFacts}
            aria-busy="true"
            aria-label={t("joinRoom.loading")}
            role="status"
          >
            <FactSkeleton />
            <FactSkeleton />
          </div>
        ) : room ? (
          <div className={styles.roomFacts}>
            <span className={styles.fact}>
              <strong>{room.hostName}</strong>
              {t("joinRoom.hostLabel")}
            </span>
            <span className={styles.fact}>
              <strong>{room.playerCount}</strong>
              {t("joinRoom.playersLabel")}
            </span>
          </div>
        ) : (
          <StatusBanner>{t("joinRoom.notFound")}</StatusBanner>
        )}

        {nameGate.hasName ? (
          <IdentityChip
            className={styles.identity}
            displayName={nameGate.displayName}
            onChange={nameGate.openNameSheet}
          />
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <Button disabled={!room} fullWidth haptic size="lg" type="submit">
            {t("joinRoom.joinAction")}
          </Button>
        </form>
      </section>
      <NameSheet {...nameGate.nameSheetProps} />
    </AppPageShell>
  );
}

/** A fact tile while the preview loads: the value line and the label line at their heights. */
function FactSkeleton() {
  return (
    <span aria-hidden="true" className={styles.fact}>
      <span className={styles.factValueLine}>
        <Skeleton variant="text" width="70%" />
      </span>
      <span className={styles.factLabelLine}>
        <Skeleton variant="text" width="40%" />
      </span>
    </span>
  );
}
