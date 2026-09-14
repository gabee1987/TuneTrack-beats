import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { Button } from "../../../features/ui/primitives";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../lobbyPageStyles";
import type { CloseRoomActionStatus, StartGameActionStatus } from "../LobbyPage.types";

interface LobbyRoomActionsProps {
  buttonClassName?: string | undefined;
  closeRoomActionStatus: CloseRoomActionStatus;
  isCloseRoomPending: boolean;
  isStartGamePending: boolean;
  onCloseRoom: () => void;
  onIntentToStartGame?: (() => void) | undefined;
  onStartGame?: (() => void) | undefined;
  startGameActionStatus: StartGameActionStatus;
}

export function LobbyRoomActions({
  buttonClassName,
  closeRoomActionStatus,
  isCloseRoomPending,
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
  let closeRoomButtonLabel = t("lobby.actions.closeRoom");
  if (closeRoomActionStatus === "pending") {
    closeRoomButtonLabel = t("room.close.pending");
  } else if (closeRoomActionStatus === "retrying") {
    closeRoomButtonLabel = t("room.close.retrying");
  } else if (closeRoomActionStatus === "failed") {
    closeRoomButtonLabel = t("room.close.retry");
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
        disabled={isCloseRoomPending}
        fullWidth
        onClick={onCloseRoom}
        type="button"
        variant="danger"
      >
        {closeRoomButtonLabel}
      </Button>
    </SurfaceCard>
  );
}
