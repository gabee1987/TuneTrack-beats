import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";

const DEFAULT_ROOM_ID = "party-room";
const DEFAULT_DISPLAY_NAME = "Player 1";

export interface HomePageController {
  displayName: string;
  roomId: string;
  setDisplayName: (value: string) => void;
  setRoomId: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function useHomePageController(): HomePageController {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(DEFAULT_ROOM_ID);
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedRoomId = roomId.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedRoomId || !trimmedDisplayName) {
      return;
    }

    rememberPlayerDisplayName(trimmedDisplayName);

    navigate(
      `/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(
        trimmedDisplayName,
      )}`,
    );
  }

  return {
    displayName,
    roomId,
    setDisplayName,
    setRoomId,
    handleSubmit,
  };
}
