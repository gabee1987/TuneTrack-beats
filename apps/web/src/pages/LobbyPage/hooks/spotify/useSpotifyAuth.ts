import {
  ClientToServerEvent,
  ServerToClientEvent,
  type SpotifyAccountType,
  type SpotifyAuthResultPayload,
  type SpotifyAuthUrlPayload,
} from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { localizeSpotifyAuthError } from "../../../../features/i18n/localizedErrors";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { AuthPhase } from "./lobbySpotify.types";

export function useSpotifyAuth(roomId: string | undefined) {
  const { t } = useI18n();
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<SpotifyAccountType | null>(null);
  const authPopupRef = useRef<Window | null>(null);

  const closeAuthPopup = useCallback(() => {
    const popup = authPopupRef.current;
    if (popup && !popup.closed) popup.close();
    authPopupRef.current = null;
  }, []);

  const handleAuthResult = useCallback(
    (payload: SpotifyAuthResultPayload) => {
      if (payload.success) {
        setAuthPhase("idle");
        setAuthError(null);
        setAccountType(payload.accountType);
      } else {
        setAuthPhase("error");
        setAuthError(localizeSpotifyAuthError(t, payload));
      }
    },
    [t],
  );

  const resetAuth = useCallback(() => {
    setAuthPhase("idle");
    setAuthError(null);
  }, []);

  function connectSpotify() {
    if (!roomId) return;

    setAuthPhase("connecting");
    setAuthError(null);

    const popup = window.open("about:blank", "spotify-auth", "popup,width=520,height=720");
    if (!popup) {
      setAuthPhase("error");
      setAuthError(t("lobby.spotify.popupBlocked"));
      return;
    }

    authPopupRef.current = popup;

    void getSocketClient().then((socket) => {
      socket.once(ServerToClientEvent.SpotifyAuthUrl, (payload: SpotifyAuthUrlPayload) => {
        if (!popup.closed) popup.location.href = payload.authUrl;
      });
      socket.emit(ClientToServerEvent.RequestSpotifyAuthUrl, { roomId });
    });
  }

  return {
    accountType,
    authError,
    authPhase,
    closeAuthPopup,
    connectSpotify,
    handleAuthResult,
    resetAuth,
  };
}
