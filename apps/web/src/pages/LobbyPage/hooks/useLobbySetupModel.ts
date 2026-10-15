import { useMemo } from "react";
import { useConnectionStatus } from "../../../services/socket/connectionState";
import type { LobbyPageController } from "../LobbyPage.types";
import { selectLobbySetup, type LobbySetupModel } from "./lobbySetupModel";

export function useLobbySetupModel(controller: LobbyPageController): LobbySetupModel {
  const connectionStatus = useConnectionStatus();
  const { currentPlayerId, currentSettings, roomState, startGameActionStatus } = controller;

  return useMemo(
    () =>
      selectLobbySetup({
        connectionStatus,
        currentPlayerId,
        roomState,
        settings: currentSettings,
        startGameActionStatus,
      }),
    [connectionStatus, currentPlayerId, currentSettings, roomState, startGameActionStatus],
  );
}
