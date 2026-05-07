import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { preloadLobbyRuntime } from "../../../app/preloadRoutes";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";
import {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_ROOM_ID,
  buildHomePageNavigationTarget,
} from "../../HomePage/homePageNavigation";
import { createSuggestedRoomCode } from "../../HomePage/roomCode";
import { useRoomDirectory } from "../../HomePage/hooks/useRoomDirectory";

export function usePlayPageController() {
  const navigate = useNavigate();
  const [createRoomId, setCreateRoomId] = useState(createSuggestedRoomCode);
  const [joinRoomId, setJoinRoomId] = useState(DEFAULT_ROOM_ID);
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const { refreshRooms, rooms } = useRoomDirectory();

  function openLobby(intent: "create" | "join", roomId: string) {
    preloadLobbyRuntime();

    const navigationTarget = buildHomePageNavigationTarget({
      displayName,
      intent,
      roomId,
    });

    if (!navigationTarget) return;

    rememberPlayerDisplayName(navigationTarget.displayName);
    navigate(navigationTarget.path);
  }

  function handleCreateRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openLobby("create", createRoomId);
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
    createRoomId,
    displayName,
    handleCreateRoomSubmit,
    handleJoinRoomSubmit,
    handleSelectRoom,
    joinRoomId,
    preloadLobby: preloadLobbyRuntime,
    refreshRooms,
    rooms,
    setCreateRoomId,
    setDisplayName,
    setJoinRoomId,
  };
}
