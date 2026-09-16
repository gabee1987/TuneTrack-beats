import {
  ClientToServerEvent,
  type PublicRoomSettings,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { RoomSettingsActionStatus } from "../LobbyPage.types";

interface UseLobbyRoomSettingsActionOptions {
  isHost: boolean;
  roomState: PublicRoomState | null;
}

function areSubmittedSettingsCurrent(
  currentSettings: PublicRoomSettings,
  submittedSettings: PublicRoomSettings,
) {
  return (
    currentSettings.targetTimelineCardCount === submittedSettings.targetTimelineCardCount &&
    currentSettings.defaultStartingTimelineCardCount ===
      submittedSettings.defaultStartingTimelineCardCount &&
    currentSettings.startingTtTokenCount === submittedSettings.startingTtTokenCount &&
    currentSettings.revealConfirmMode === submittedSettings.revealConfirmMode &&
    currentSettings.ttModeEnabled === submittedSettings.ttModeEnabled &&
    currentSettings.challengeWindowDurationSeconds ===
      submittedSettings.challengeWindowDurationSeconds
  );
}

export function useLobbyRoomSettingsAction({
  isHost,
  roomState,
}: UseLobbyRoomSettingsActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionStatus, setActionStatus] = useState<RoomSettingsActionStatus>("idle");

  const handleRoomSettingsChange = useCallback(
    (nextSettings: PublicRoomSettings) => {
      if (!roomState || !isHost || isPendingRef.current) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      function isSubmittedUpdateCurrent() {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.status === "lobby" &&
          currentRoomState.hostId === submittedHostId &&
          !areSubmittedSettingsCurrent(currentRoomState.settings, nextSettings)
        );
      }

      isPendingRef.current = true;
      setActionStatus("pending");
      void (async () => {
        try {
          const result = await emitAction(
            ClientToServerEvent.UpdateRoomSettings,
            { roomId: submittedRoomId, ...nextSettings },
            {
              onTimeoutRetry: () => {
                if (isSubmittedUpdateCurrent()) {
                  setActionStatus("retrying");
                }
              },
              retryOnTimeout: true,
            },
          );
          setActionStatus(
            result.status === "timeout" && isSubmittedUpdateCurrent() ? "failed" : "idle",
          );
        } catch {
          setActionStatus(isSubmittedUpdateCurrent() ? "failed" : "idle");
        } finally {
          isPendingRef.current = false;
        }
      })();
    },
    [isHost, roomState],
  );

  return {
    actionStatus,
    handleRoomSettingsChange,
    isPending: actionStatus === "pending" || actionStatus === "retrying",
  };
}
