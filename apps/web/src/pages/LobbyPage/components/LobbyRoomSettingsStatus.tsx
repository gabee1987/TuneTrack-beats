import { useI18n } from "../../../features/i18n";
import type { RoomSettingsActionStatus } from "../LobbyPage.types";
import styles from "../lobbyPageStyles";

interface LobbyRoomSettingsStatusProps {
  actionStatus: RoomSettingsActionStatus;
}

export function LobbyRoomSettingsStatus({ actionStatus }: LobbyRoomSettingsStatusProps) {
  const { t } = useI18n();

  if (actionStatus !== "retrying" && actionStatus !== "failed") {
    return null;
  }

  return (
    <p aria-live="polite" className={styles.settingsInlineHint}>
      {actionStatus === "retrying"
        ? t("lobby.host.settingsRetrying")
        : t("lobby.host.settingsFailed")}
    </p>
  );
}
