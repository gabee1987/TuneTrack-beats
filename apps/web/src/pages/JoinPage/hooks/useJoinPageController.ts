import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { preloadLobbyRuntime } from "../../../app/preloadRoutes";
import { useI18n } from "../../../features/i18n";
import { useNameGate } from "../../../features/profile/useNameGate";
import { getConnectionProblemLabelKey } from "../../../features/rooms/connectionStatusLabel";
import { buildInviteJoinPath } from "../../../features/rooms/roomNavigation";
import { useRoomDirectory } from "../../../features/rooms/useRoomDirectory";
import { useConnectionStatus } from "../../../services/socket/connectionState";
import { useJoinByCode } from "./useJoinByCode";

export function useJoinPageController() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const nameGate = useNameGate();
  const [code, setCode] = useState("");
  const { hasLoaded, rooms } = useRoomDirectory();
  const connectionProblemKey = getConnectionProblemLabelKey(useConnectionStatus());

  function goToLobby(roomId: string) {
    const path = buildInviteJoinPath(roomId);
    if (!path) return;
    preloadLobbyRuntime();
    navigate(path);
  }

  const joinByCode = useJoinByCode(goToLobby);

  function getJoinDisabledReason(): string | null {
    if (!code.trim()) return t("join.reason.codeRequired");
    if (connectionProblemKey) return t(connectionProblemKey);
    return null;
  }

  return {
    code,
    connectionProblem: connectionProblemKey ? t("join.offline") : null,
    hasLoadedRooms: hasLoaded,
    identity: nameGate.hasName
      ? { displayName: nameGate.displayName, onChange: nameGate.openNameSheet }
      : null,
    isJoining: joinByCode.status === "checking",
    joinDisabledReason: getJoinDisabledReason(),
    nameSheetProps: nameGate.nameSheetProps,
    notFoundMessage: joinByCode.status === "not_found" ? t("join.notFound") : null,
    rooms,
    handleBack: () => {
      // Back returns to where the player came from; a direct visit has nowhere to return to.
      if (location.key === "default") navigate("/", { replace: true });
      else navigate(-1);
    },
    handleCodeChange: (nextCode: string) => {
      setCode(nextCode);
      joinByCode.clearNotFound();
    },
    handleSelectRoom: (roomId: string) => nameGate.requireName(() => goToLobby(roomId)),
    handleSubmit: () => nameGate.requireName(() => joinByCode.submit(code)),
    preloadLobby: preloadLobbyRuntime,
  };
}

export type JoinPageController = ReturnType<typeof useJoinPageController>;
