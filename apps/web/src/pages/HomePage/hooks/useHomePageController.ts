import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { preloadLobbyRuntime } from "../../../app/preloadRoutes";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";
import type { HomePageController } from "../HomePage.types";
import {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_ROOM_ID,
  buildHomePageNavigationTarget,
} from "../homePageNavigation";

export function useHomePageController(): HomePageController {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(DEFAULT_ROOM_ID);
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    preloadLobbyRuntime();

    const navigationTarget = buildHomePageNavigationTarget({
      displayName,
      roomId,
    });

    if (navigationTarget === null) {
      return;
    }

    rememberPlayerDisplayName(navigationTarget.displayName);
    navigate(navigationTarget.path);
  }

  return {
    displayName,
    preloadLobby: preloadLobbyRuntime,
    roomId,
    setDisplayName,
    setRoomId,
    handleSubmit,
  };
}
