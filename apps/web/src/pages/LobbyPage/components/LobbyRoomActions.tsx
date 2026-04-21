import { ActionButton } from "../../../features/ui/ActionButton";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

interface LobbyRoomActionsProps {
  buttonClassName?: string | undefined;
  onCloseRoom: () => void;
}

export function LobbyRoomActions({
  buttonClassName,
  onCloseRoom,
}: LobbyRoomActionsProps) {
  return (
    <SurfaceCard className={styles.roomActionsSection}>
      <LobbySectionHeader
        description="Closing the room sends everyone back to the main menu."
        title="Room actions"
      />
      <ActionButton
        className={`${styles.cancelRoomButton}${buttonClassName ? ` ${buttonClassName}` : ""}`}
        onClick={onCloseRoom}
        type="button"
        variant="danger"
      >
        Close Room
      </ActionButton>
    </SurfaceCard>
  );
}
