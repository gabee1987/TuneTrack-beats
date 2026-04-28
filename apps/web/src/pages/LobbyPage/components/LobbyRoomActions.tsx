import { ActionButton } from "../../../features/ui/ActionButton";
import { useI18n } from "../../../features/i18n";
import { RoomDangerActionButton } from "../../../features/ui/RoomDangerActionButton";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

interface LobbyRoomActionsProps {
  buttonClassName?: string | undefined;
  onCloseRoom: () => void;
  onIntentToStartGame?: (() => void) | undefined;
  onStartGame?: (() => void) | undefined;
}

export function LobbyRoomActions({
  buttonClassName,
  onCloseRoom,
  onIntentToStartGame,
  onStartGame,
}: LobbyRoomActionsProps) {
  const { t } = useI18n();

  return (
    <SurfaceCard className={styles.roomActionsSection}>
      <LobbySectionHeader
        description={t("lobby.actions.description")}
        title={t("lobby.actions.title")}
      />
      {onStartGame ? (
        <ActionButton
          className={styles.roomStartGameButton}
          onClick={onStartGame}
          onFocus={onIntentToStartGame}
          onMouseEnter={onIntentToStartGame}
          onTouchStart={onIntentToStartGame}
          type="button"
        >
          {t("lobby.actions.startGame")}
        </ActionButton>
      ) : null}
      <RoomDangerActionButton
        className={`${styles.cancelRoomButton}${buttonClassName ? ` ${buttonClassName}` : ""}`}
        onClick={onCloseRoom}
        type="button"
      >
        {t("lobby.actions.closeRoom")}
      </RoomDangerActionButton>
    </SurfaceCard>
  );
}
