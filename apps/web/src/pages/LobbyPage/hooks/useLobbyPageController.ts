import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePlayerProfileStore } from "../../../features/profile/playerProfile";
import { getOrCreatePlayerSessionId } from "../../../services/session/playerSession";
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
  spotifyPlaybackOwnerPlayerId: null,
  spotifyPlaybackGeneration: 0,
};

export function useLobbyPageController(): LobbyPageController {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const storedDisplayName = usePlayerProfileStore((state) => state.displayName);
  const setDisplayName = usePlayerProfileStore((state) => state.setDisplayName);
  const queryDisplayName = searchParams.get("playerName")?.trim() ?? "";
  const displayName = storedDisplayName || queryDisplayName;
  const routeState = (location.state ?? {}) as { intent?: "create" };
  const intentRef = useRef<"create" | "join">(
    routeState.intent === "create" ? "create" : "join",
  );
  const intent = intentRef.current;
  const playerSessionId = useMemo(() => getOrCreatePlayerSessionId(), []);
  const {
    connectionStatus,
    currentPlayerId,
    errorCode,
    errorMessage,
    handleClosedRoomReset,
    hasClosedRoomReset,
    roomState,
  } = useLobbyRoomConnection({
    displayName,
    intent,
    navigate,
    playerSessionId,
    roomId,
  });

  const isHost = roomState?.hostId === currentPlayerId;
  const currentSettings = roomState?.settings ?? fallbackRoomSettings;
  const actions = useLobbyRoomActions({
    currentPlayerId,
    currentSettings,
    isHost,
    roomState,
  });

  useEffect(() => {
    if (!storedDisplayName && queryDisplayName) {
      setDisplayName(queryDisplayName);
    }
  }, [queryDisplayName, setDisplayName, storedDisplayName]);

  async function handlePlayerProfileChange(nextDisplayName: string) {
    const didUpdateProfile = await actions.handlePlayerProfileChange(nextDisplayName);
    if (didUpdateProfile) {
      setDisplayName(nextDisplayName);
    }
    return didUpdateProfile;
  }

  useEffect(() => {
    if (roomState?.status === "lobby") {
      preloadGameRuntime();
    }
  }, [roomState?.roomId, roomState?.status]);

  return {
    closeRoomActionStatus: actions.closeRoomActionStatus,
    connectionStatus,
    currentPlayerId,
    currentSettings,
    displayName,
    errorCode,
    errorMessage,
    handleClosedRoomReset,
    handleCloseRoom: actions.handleCloseRoom,
    hasClosedRoomReset,
    identityActionState: actions.identityActionState,
    handlePlayerKick: actions.handlePlayerKick,
    handlePlayerStartingCardCountChange: actions.handlePlayerStartingCardCountChange,
    handlePlayerStartingTtTokenCountChange: actions.handlePlayerStartingTtTokenCountChange,
    handlePlayerProfileChange,
    handleRoomRename: actions.handleRoomRename,
    handleRoomSettingsChange: actions.handleRoomSettingsChange,
    handleStartGame: actions.handleStartGame,
    isHost,
    isCloseRoomPending: actions.isCloseRoomPending,
    isKickPlayerPending: actions.isKickPlayerPending,
    isIdentityActionPending: actions.isIdentityActionPending,
    isPlayerSettingsPending: actions.isPlayerSettingsPending,
    isRoomSettingsPending: actions.isRoomSettingsPending,
    isStartGamePending: actions.isStartGamePending,
    kickPlayerActionState: actions.kickPlayerActionState,
    playerSettingsActionState: actions.playerSettingsActionState,
    roomSettingsActionStatus: actions.roomSettingsActionStatus,
    preloadGame: preloadGameRuntime,
    roomId,
    roomState,
    startGameActionStatus: actions.startGameActionStatus,
    toggleTtMode: actions.toggleTtMode,
  };
}
