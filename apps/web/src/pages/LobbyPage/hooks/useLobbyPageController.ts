import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  ClientToServerEvent,
  type PlayerIdentityPayload,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
  type RevealConfirmMode,
  type RoomClosedPayload,
  type ServerErrorPayload,
  ServerToClientEvent,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
  rememberPlayerDisplayName,
} from "../../../services/session/playerSession";
import { socketClient } from "../../../services/socket/socketClient";

const DEFAULT_ENABLED_STARTING_TT_TOKEN_COUNT = 1;

const fallbackRoomSettings: PublicRoomSettings = {
  challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  revealConfirmMode: "host_only",
  startingTtTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
  targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  ttModeEnabled: false,
};

export interface LobbyPageController {
  connectionStatus: string;
  currentPlayerId: string | null;
  currentSettings: PublicRoomSettings;
  displayName: string;
  errorMessage: string | null;
  isHost: boolean;
  roomId: string | undefined;
  roomState: PublicRoomState | null;
  handleCloseRoom: () => void;
  handlePlayerStartingCardCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  toggleTtMode: (enabled: boolean) => void;
}

export function useLobbyPageController(): LobbyPageController {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const displayName = useMemo(
    () => searchParams.get("playerName")?.trim() ?? getRememberedPlayerDisplayName(),
    [searchParams],
  );
  const playerSessionId = useMemo(() => getOrCreatePlayerSessionId(), []);

  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHost = roomState?.hostId === currentPlayerId;
  const currentSettings = roomState?.settings ?? fallbackRoomSettings;

  useEffect(() => {
    if (!roomId || !displayName) {
      navigate("/");
      return;
    }

    rememberPlayerDisplayName(displayName);

    function handleConnect() {
      setConnectionStatus("Connected");
      setErrorMessage(null);
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        displayName,
        roomId,
        sessionId: playerSessionId,
      });
    }

    function handleDisconnect() {
      setConnectionStatus("Disconnected");
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);

      if (payload.roomState.status !== "lobby") {
        navigate(`/game/${encodeURIComponent(payload.roomState.roomId)}`, {
          state: {
            currentPlayerId: currentPlayerIdRef.current,
            roomState: payload.roomState,
          },
        });
      }
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      currentPlayerIdRef.current = payload.playerId;
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    function handleRoomClosed(_: RoomClosedPayload) {
      navigate("/");
    }

    socketClient.on("connect", handleConnect);
    socketClient.on("disconnect", handleDisconnect);
    socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
    socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);
    socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
    socketClient.on(ServerToClientEvent.Error, handleError);

    if (!socketClient.connected) {
      socketClient.connect();
    } else {
      handleConnect();
    }

    return () => {
      socketClient.off("connect", handleConnect);
      socketClient.off("disconnect", handleDisconnect);
      socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
    };
  }, [displayName, navigate, playerSessionId, roomId]);

  function handleRoomSettingsChange(nextSettings: PublicRoomSettings) {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: roomState.roomId,
      ...nextSettings,
    });
  }

  function handlePlayerStartingCardCountChange(
    player: PublicPlayerState,
    nextValue: number,
  ) {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.UpdatePlayerSettings, {
      playerId: player.id,
      roomId: roomState.roomId,
      startingTimelineCardCount: nextValue,
    });
  }

  function handleStartGame() {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.StartGame, {
      roomId: roomState.roomId,
    });
  }

  function handleCloseRoom() {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
    });
  }

  function toggleTtMode(enabled: boolean) {
    handleRoomSettingsChange(
      enabled
        ? {
            ...currentSettings,
            startingTtTokenCount: currentSettings.ttModeEnabled
              ? currentSettings.startingTtTokenCount
              : DEFAULT_ENABLED_STARTING_TT_TOKEN_COUNT,
            ttModeEnabled: true,
          }
        : {
            ...currentSettings,
            ttModeEnabled: false,
          },
    );
  }

  return {
    connectionStatus,
    currentPlayerId,
    currentSettings,
    displayName,
    errorMessage,
    handleCloseRoom,
    handlePlayerStartingCardCountChange,
    handleRoomSettingsChange,
    handleStartGame,
    isHost,
    roomId,
    roomState,
    toggleTtMode,
  };
}
