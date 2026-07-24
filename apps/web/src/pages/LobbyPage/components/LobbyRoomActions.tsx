import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { Button } from "../../../features/ui/primitives";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../lobbyPageStyles";

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
        <Button
          fullWidth
          haptic
          onClick={onStartGame}
          onFocus={onIntentToStartGame}
          onMouseEnter={onIntentToStartGame}
          onTouchStart={onIntentToStartGame}
          size="lg"
          type="button"
        >
          {t("lobby.actions.startGame")}
        </Button>
      ) : null}
      <Button
        className={`${styles.cancelRoomButton}${buttonClassName ? ` ${buttonClassName}` : ""}`}
        fullWidth
        onClick={onCloseRoom}
        type="button"
        variant="danger"
      >
        {t("lobby.actions.closeRoom")}
      </Button>
    </SurfaceCard>
  );
}
