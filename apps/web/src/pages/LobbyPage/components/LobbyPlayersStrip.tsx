import type { PublicPlayerState } from "@tunetrack/shared/client";
import { useI18n } from "../../../features/i18n";
import { ArrivalListPresence } from "../../../features/motion";
import { classNames } from "../../../features/ui/classNames";
import type { LobbyPlayersStrip as LobbyPlayersStripModel } from "../hooks/lobbySetupModel";
import cardStyles from "./lobbyCard.module.css";
import styles from "./LobbyPlayersStrip.module.css";

interface LobbyPlayersStripProps {
  currentPlayerId: string | null;
  /** Own chip: opens the Name sheet. */
  onEditName: () => void;
  /** "+N more": opens the full player list; without it the strip shows only the count. */
  onShowAll?: (() => void) | undefined;
  strip: LobbyPlayersStripModel;
}

/** Who is in the room at a glance; the viewer's own chip adds "(you)" and changes their name. */
export function LobbyPlayersStrip({
  currentPlayerId,
  onEditName,
  onShowAll,
  strip,
}: LobbyPlayersStripProps) {
  const { t } = useI18n();

  return (
    <div className={styles.strip}>
      <p className={styles.count}>{t("lobby.players.count", { count: strip.total })}</p>
      <div className={styles.row}>
        <ArrivalListPresence
          aria-label={t("lobby.players.count", { count: strip.total })}
          className={styles.list}
          items={strip.shown.map((player) => ({
            content: (
              <PlayerChip
                isSelf={player.id === currentPlayerId}
                onEditName={onEditName}
                player={player}
              />
            ),
            key: player.id,
          }))}
        />
        {strip.hiddenCount > 0 && onShowAll ? (
          <button
            aria-label={t("lobby.players.showAll", { count: strip.total })}
            className={classNames(styles.chip, styles.more)}
            onClick={onShowAll}
            type="button"
          >
            {t("lobby.players.more", { count: strip.hiddenCount })}
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface PlayerChipProps {
  isSelf: boolean;
  onEditName: () => void;
  player: PublicPlayerState;
}

function PlayerChip({ isSelf, onEditName, player }: PlayerChipProps) {
  const { t } = useI18n();
  const content = (
    <>
      <span className={styles.name}>
        {isSelf ? t("lobby.players.selfName", { name: player.displayName }) : player.displayName}
      </span>
      {player.isHost ? <CrownGlyph /> : null}
      {player.isHost ? (
        <span className={cardStyles.visuallyHidden}>{`, ${t("lobby.players.host")}`}</span>
      ) : null}
    </>
  );

  if (!isSelf) {
    return <span className={styles.chip}>{content}</span>;
  }

  return (
    <button className={classNames(styles.chip, styles.self)} onClick={onEditName} type="button">
      {content}
      <span className={cardStyles.visuallyHidden}>{`. ${t("lobby.players.changeName")}`}</span>
    </button>
  );
}

function CrownGlyph() {
  return (
    <svg aria-hidden="true" className={styles.crown} fill="none" viewBox="0 0 24 24">
      <path
        d="M4 8L8.5 12L12 6L15.5 12L20 8L18.5 18H5.5L4 8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
