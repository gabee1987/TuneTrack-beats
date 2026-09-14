import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { Button } from "../../../features/ui/primitives";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../lobbyPageStyles";
import type { StartGameActionStatus } from "../LobbyPage.types";

interface LobbyRoomActionsProps {
  buttonClassName?: string | undefined;
  isStartGamePending: boolean;
  onCloseRoom: () => void;
  onIntentToStartGame?: (() => void) | undefined;
  onStartGame?: (() => void) | undefined;
  startGameActionStatus: StartGameActionStatus;
}

export function LobbyRoomActions({
  buttonClassName,
  isStartGamePending,
  onCloseRoom,
  onIntentToStartGame,
  onStartGame,
  startGameActionStatus,
}: LobbyRoomActionsProps) {
  const { t } = useI18n();
  let startGameButtonLabel = t("lobby.actions.startGame");
  if (startGameActionStatus === "pending") {
    startGameButtonLabel = t("lobby.startGame.pending");
  } else if (startGameActionStatus === "retrying") {
    startGameButtonLabel = t("lobby.startGame.retrying");
  } else if (startGameActionStatus === "failed") {
    startGameButtonLabel = t("lobby.startGame.retry");
  }

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
          disabled={isStartGamePending}
          onClick={onStartGame}
          onFocus={onIntentToStartGame}
          onMouseEnter={onIntentToStartGame}
          onTouchStart={onIntentToStartGame}
          size="lg"
          type="button"
        >
          {startGameButtonLabel}
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
