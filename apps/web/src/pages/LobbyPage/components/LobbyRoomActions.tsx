import { ActionButton } from "../../../features/ui/ActionButton";
import { RoomDangerActionButton } from "../../../features/ui/RoomDangerActionButton";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

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
  return (
    <SurfaceCard className={styles.roomActionsSection}>
      <LobbySectionHeader
        description="Closing the room sends everyone back to the main menu."
        title="Room actions"
      />
      {onStartGame ? (
        <ActionButton
          className={styles.roomStartGameButton}
          onClick={onStartGame}
          onFocus={onIntentToStartGame}
          onMouseEnter={onIntentToStartGame}
          onTouchStart={onIntentToStartGame}
          type="button"
        >
          Start Game
        </ActionButton>
      ) : null}
      <RoomDangerActionButton
        className={`${styles.cancelRoomButton}${buttonClassName ? ` ${buttonClassName}` : ""}`}
        onClick={onCloseRoom}
        type="button"
      >
        Close Room
      </RoomDangerActionButton>
    </SurfaceCard>
  );
}
