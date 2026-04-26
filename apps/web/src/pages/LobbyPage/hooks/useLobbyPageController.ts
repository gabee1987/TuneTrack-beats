import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../../services/session/playerSession";
import { preloadGameRuntime } from "../../../app/preloadRoutes";
import type { LobbyPageController } from "../LobbyPage.types";
import { useLobbyRoomActions } from "./useLobbyRoomActions";
import { useLobbyRoomConnection } from "./useLobbyRoomConnection";

const fallbackRoomSettings: PublicRoomSettings = {
  challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  revealConfirmMode: "host_only",
  startingTtTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
  targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  ttModeEnabled: false,
  playlistImported: false,
  importedTrackCount: 0,
  spotifyAuthStatus: "none",
  spotifyAccountType: null,
};

export function useLobbyPageController(): LobbyPageController {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const displayName = useMemo(
    () => searchParams.get("playerName")?.trim() ?? getRememberedPlayerDisplayName(),
    [searchParams],
  );
  const playerSessionId = useMemo(() => getOrCreatePlayerSessionId(), []);
  const {
    connectionStatus,
    currentPlayerId,
    errorMessage,
    roomState,
  } = useLobbyRoomConnection({
    displayName,
    navigate,
    playerSessionId,
    roomId,
  });

  const isHost = roomState?.hostId === currentPlayerId;
  const currentSettings = roomState?.settings ?? fallbackRoomSettings;
  const actions = useLobbyRoomActions({
    currentSettings,
    isHost,
    roomState,
  });

  useEffect(() => {
    if (roomState?.status === "lobby") {
      preloadGameRuntime();
    }
  }, [roomState?.roomId, roomState?.status]);

  return {
    connectionStatus,
    currentPlayerId,
    currentSettings,
    displayName,
    errorMessage,
    handleCloseRoom: actions.handleCloseRoom,
    handlePlayerStartingCardCountChange:
      actions.handlePlayerStartingCardCountChange,
    handlePlayerStartingTtTokenCountChange:
      actions.handlePlayerStartingTtTokenCountChange,
    handlePlayerProfileChange: actions.handlePlayerProfileChange,
    handleRoomSettingsChange: actions.handleRoomSettingsChange,
    handleStartGame: actions.handleStartGame,
    isHost,
    preloadGame: preloadGameRuntime,
    roomId,
    roomState,
    toggleTtMode: actions.toggleTtMode,
  };
}
