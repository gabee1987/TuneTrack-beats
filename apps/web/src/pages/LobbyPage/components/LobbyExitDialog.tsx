import { useRef } from "react";
import { useI18n } from "../../../features/i18n";
import { Button, Dialog } from "../../../features/ui/primitives";
import type { CloseRoomActionStatus } from "../LobbyPage.types";
import { useLeaveLobby } from "../hooks/useLeaveLobby";
import styles from "./LobbyExitDialog.module.css";

interface LobbyExitDialogProps {
  closeRoomActionStatus: CloseRoomActionStatus;
  isHost: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCloseRoom: () => void;
}

/**
 * The lobby's way back to Home, confirmed: the host closes the room for everyone, a guest leaves
 * it. The room-closed flow takes the host home; a guest goes home at once.
 */
export function LobbyExitDialog({
  closeRoomActionStatus,
  isHost,
  isOpen,
  onClose,
  onCloseRoom,
}: LobbyExitDialogProps) {
  const { t } = useI18n();
  const leaveLobby = useLeaveLobby();

  const isLeavingRef = useRef(false);

  function leaveRoom() {
    isLeavingRef.current = true;
    onClose();
  }

  // Leaving waits for the dialog's own history entry to pop, so the two navigations never race.
  function handleClosed() {
    if (!isLeavingRef.current) return;
    isLeavingRef.current = false;
    leaveLobby();
  }

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onClose} variant="ghost">
            {t("common.cancel")}
          </Button>
          {isHost ? (
            <Button
              disabled={closeRoomActionStatus === "pending" || closeRoomActionStatus === "retrying"}
              haptic
              onClick={onCloseRoom}
              variant="danger"
            >
              {getCloseLabel(closeRoomActionStatus, t)}
            </Button>
          ) : (
            <Button haptic onClick={leaveRoom} variant="danger">
              {t("lobby.exit.leaveConfirm")}
            </Button>
          )}
        </>
      }
      closeLabel={t("common.close")}
      isOpen={isOpen}
      onClose={onClose}
      onClosed={handleClosed}
      title={isHost ? t("lobby.exit.closeTitle") : t("lobby.exit.leaveTitle")}
    >
      <p className={styles.message}>
        {isHost ? t("lobby.exit.closeBody") : t("lobby.exit.leaveBody")}
      </p>
    </Dialog>
  );
}

function getCloseLabel(status: CloseRoomActionStatus, t: (key: string) => string): string {
  switch (status) {
    case "idle":
      return t("lobby.exit.closeLabel");
    case "pending":
      return t("room.close.pending");
    case "retrying":
      return t("room.close.retrying");
    case "failed":
      return t("room.close.retry");
  }
}
