import { useI18n } from "../../../features/i18n";
import { Button } from "../../../features/ui/primitives";
import styles from "../lobbyPageStyles";
import type { StartGameActionStatus } from "../LobbyPage.types";

interface LobbyHostStartPanelProps {
  isStartGamePending: boolean;
  onIntentToStart: () => void;
  onStartGame: () => void;
  startGameActionStatus: StartGameActionStatus;
}

export function LobbyHostStartPanel({
  isStartGamePending,
  onIntentToStart,
  onStartGame,
  startGameActionStatus,
}: LobbyHostStartPanelProps) {
  const { t } = useI18n();
  let startGameButtonLabel = t("lobby.host.startGame");
  if (startGameActionStatus === "pending") {
    startGameButtonLabel = t("lobby.startGame.pending");
  } else if (startGameActionStatus === "retrying") {
    startGameButtonLabel = t("lobby.startGame.retrying");
  } else if (startGameActionStatus === "failed") {
    startGameButtonLabel = t("lobby.startGame.retry");
  }

  return (
    <div className={styles.primaryActionBar}>
      <div>
        <h3 className={styles.primaryActionTitle}>{t("lobby.host.readyTitle")}</h3>
        <p className={styles.primaryActionDescription}>{t("lobby.host.readyDescription")}</p>
      </div>
      <Button
        className={styles.startGameButton}
        disabled={isStartGamePending}
        haptic
        onClick={onStartGame}
        onFocus={onIntentToStart}
        onMouseEnter={onIntentToStart}
        onTouchStart={onIntentToStart}
        size="lg"
        type="button"
      >
        {startGameButtonLabel}
      </Button>
    </div>
  );
}
