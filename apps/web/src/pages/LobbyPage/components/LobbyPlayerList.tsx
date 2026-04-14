import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

interface LobbyPlayerListProps {
  currentPlayerId: string | null;
  isHost: boolean;
  players: PublicPlayerState[];
  roomSettings: PublicRoomSettings;
  onPlayerStartingCardCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
}

export function LobbyPlayerList({
  currentPlayerId,
  isHost,
  players,
  roomSettings,
  onPlayerStartingCardCountChange,
}: LobbyPlayerListProps) {
  return (
    <SurfaceCard className={styles.rosterSection}>
      <LobbySectionHeader
        description="Everyone currently in the room."
        title="Players"
      />

      <ul className={styles.playerList}>
        {players.map((player) => {
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <li className={styles.playerItem} key={player.id}>
              <div className={styles.playerInfoRow}>
                <div className={styles.playerIdentity}>
                  <strong className={styles.playerName}>
                    {isCurrentPlayer ? "You" : player.displayName}
                  </strong>
                  {!isCurrentPlayer ? (
                    <span className={styles.playerSecondaryName}>
                      {player.displayName}
                    </span>
                  ) : null}
                </div>

                <div className={styles.playerBadges}>
                  <span className={styles.inlineBadge}>
                    {player.startingTimelineCardCount} cards
                  </span>
                  {roomSettings.ttModeEnabled ? (
                    <span className={styles.inlineBadge}>{player.ttTokenCount} TT</span>
                  ) : null}
                  {player.isHost ? (
                    <span className={styles.inlineBadgeStrong}>Host</span>
                  ) : null}
                </div>
              </div>

              {isHost ? (
                <label className={styles.playerSettingField}>
                  <div className={styles.settingLabelRow}>
                    <span>Starting cards for {isCurrentPlayer ? "you" : player.displayName}</span>
                    <strong className={styles.settingValue}>
                      {player.startingTimelineCardCount}
                    </strong>
                  </div>
                  <input
                    className={styles.rangeInput}
                    max={MAX_STARTING_TIMELINE_CARD_COUNT}
                    min={MIN_STARTING_TIMELINE_CARD_COUNT}
                    onChange={(event) =>
                      onPlayerStartingCardCountChange(
                        player,
                        Number(event.target.value),
                      )
                    }
                    type="range"
                    value={player.startingTimelineCardCount}
                  />
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
