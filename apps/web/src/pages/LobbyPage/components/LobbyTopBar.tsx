import type { ReactNode } from "react";
import { useI18n } from "../../../features/i18n";
import { ConnectionStatus } from "../../../features/rooms/ConnectionStatus";
import { IconButton } from "../../../features/ui/primitives";
import styles from "./LobbyTopBar.module.css";

interface LobbyTopBarProps {
  isHost: boolean;
  /** Back asks first: the host closes the room, a guest leaves it (as the page's exit button). */
  onBack: () => void;
  /** After the connection chip: the app menu on desktop. */
  trailing?: ReactNode | undefined;
}

/** Back, "Lobby" and what this player does here, for both assemblies (`22` §4.4, §4.12). */
export function LobbyTopBar({ isHost, onBack, trailing }: LobbyTopBarProps) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <IconButton aria-label={t("common.back")} onClick={onBack} variant="ghost">
        <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
          <path
            d="M15 6L9 12L15 18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
          />
        </svg>
      </IconButton>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{t("lobby.eyebrow")}</p>
        <h1 className={styles.title}>{t(isHost ? "lobby.title.host" : "lobby.title.guest")}</h1>
      </div>
      <div className={styles.trailing}>
        <ConnectionStatus />
        {trailing}
      </div>
    </header>
  );
}
