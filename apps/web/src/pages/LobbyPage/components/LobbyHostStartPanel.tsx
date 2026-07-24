import { useI18n } from "../../../features/i18n";
import { Button } from "../../../features/ui/primitives";
import styles from "../lobbyPageStyles";

interface LobbyHostStartPanelProps {
  onIntentToStart: () => void;
  onStartGame: () => void;
}

export function LobbyHostStartPanel({ onIntentToStart, onStartGame }: LobbyHostStartPanelProps) {
  const { t } = useI18n();

  return (
    <div className={styles.primaryActionBar}>
      <div>
        <h3 className={styles.primaryActionTitle}>{t("lobby.host.readyTitle")}</h3>
        <p className={styles.primaryActionDescription}>{t("lobby.host.readyDescription")}</p>
      </div>
      <Button
        className={styles.startGameButton}
        haptic
        onClick={onStartGame}
        onFocus={onIntentToStart}
        onMouseEnter={onIntentToStart}
        onTouchStart={onIntentToStart}
        size="lg"
        type="button"
      >
        {t("lobby.host.startGame")}
      </Button>
    </div>
  );
}
