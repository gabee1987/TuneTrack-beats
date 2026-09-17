import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { preloadLobbyRuntime } from "../../../app/preloadRoutes";
import { usePlayerProfileStore } from "../../../features/profile/playerProfile";
import { buildHomePageNavigationTarget } from "../../HomePage/homePageNavigation";
import { useRoomDirectory } from "../../HomePage/hooks/useRoomDirectory";

export function usePlayPageController() {
  const navigate = useNavigate();
  const displayName = usePlayerProfileStore((state) => state.displayName);
  const hasCompletedSetup = usePlayerProfileStore((state) => state.hasCompletedSetup);
  const setDisplayName = usePlayerProfileStore((state) => state.setDisplayName);
  const [joinRoomId, setJoinRoomId] = useState("");
  const { refreshRooms, rooms } = useRoomDirectory();

  function openLobby(intent: "create" | "join", roomId?: string) {
    if (!hasCompletedSetup) return;

    preloadLobbyRuntime();

    const navigationTarget = buildHomePageNavigationTarget({
      intent,
      roomId,
    });

    if (!navigationTarget) return;

    navigate(navigationTarget.path, { state: navigationTarget.state });
  }

  function handleCreateRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openLobby("create");
  }

  function handleJoinRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openLobby("join", joinRoomId);
  }

  function handleSelectRoom(roomId: string) {
    setJoinRoomId(roomId);
    openLobby("join", roomId);
  }

  return {
    displayName,
    hasCompletedSetup,
    handleCreateRoomSubmit,
    handleJoinRoomSubmit,
    handleSelectRoom,
    joinRoomId,
    preloadLobby: preloadLobbyRuntime,
    refreshRooms,
    rooms,
    setDisplayName,
    setJoinRoomId,
  };
}
