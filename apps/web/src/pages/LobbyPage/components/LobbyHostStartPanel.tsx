import { useI18n } from "../../../features/i18n";
import { RoomPrimaryActionButton } from "../../../features/ui/RoomPrimaryActionButton";
import styles from "../LobbyPage.module.css";

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
      <RoomPrimaryActionButton
        className={styles.startGameButton}
        onFocus={onIntentToStart}
        onClick={onStartGame}
        onMouseEnter={onIntentToStart}
        onTouchStart={onIntentToStart}
        type="button"
      >
        {t("lobby.host.startGame")}
      </RoomPrimaryActionButton>
    </div>
  );
}
