import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ServerErrorPayload,
  type SpotifyAccountType,
  type SpotifyAuthResultPayload,
  type SpotifyAuthUrlPayload,
} from "@tunetrack/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { localizeSpotifyAuthError } from "../../../../features/i18n/localizedErrors";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { AuthPhase } from "./lobbySpotify.types";

const AUTH_POPUP_POLL_MS = 400;
const AUTH_TIMEOUT_MS = 120_000;

export function useSpotifyAuth(roomId: string | undefined) {
  const { t } = useI18n();
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<SpotifyAccountType | null>(null);
  const authPopupRef = useRef<Window | null>(null);
  const authSessionIdRef = useRef(0);
  const popupPollTimerRef = useRef<number | null>(null);
  const authTimeoutTimerRef = useRef<number | null>(null);
  const authUrlListenerRef = useRef<((payload: SpotifyAuthUrlPayload) => void) | null>(null);
  const authErrorListenerRef = useRef<((payload: ServerErrorPayload) => void) | null>(null);

  const clearAuthWatchers = useCallback(() => {
    if (popupPollTimerRef.current !== null) {
      window.clearInterval(popupPollTimerRef.current);
      popupPollTimerRef.current = null;
    }

    if (authTimeoutTimerRef.current !== null) {
      window.clearTimeout(authTimeoutTimerRef.current);
      authTimeoutTimerRef.current = null;
    }

    void getSocketClient().then((socket) => {
      if (authUrlListenerRef.current) {
        socket.off(ServerToClientEvent.SpotifyAuthUrl, authUrlListenerRef.current);
        authUrlListenerRef.current = null;
      }

      if (authErrorListenerRef.current) {
        socket.off(ServerToClientEvent.Error, authErrorListenerRef.current);
        authErrorListenerRef.current = null;
      }
    });
  }, []);

  const closeAuthPopup = useCallback(() => {
    const popup = authPopupRef.current;
    if (popup && !popup.closed) popup.close();
    authPopupRef.current = null;
  }, []);

  const finishAuthFailure = useCallback(
    (message: string) => {
      authSessionIdRef.current += 1;
      clearAuthWatchers();
      closeAuthPopup();
      setAuthPhase("error");
      setAuthError(message);
    },
    [clearAuthWatchers, closeAuthPopup],
  );

  const handleAuthResult = useCallback(
    (payload: SpotifyAuthResultPayload) => {
      authSessionIdRef.current += 1;
      clearAuthWatchers();
      closeAuthPopup();

      if (payload.success) {
        setAuthPhase("idle");
        setAuthError(null);
        setAccountType(payload.accountType);
        return;
      }

      setAuthPhase("error");
      setAuthError(localizeSpotifyAuthError(t, payload));
    },
    [clearAuthWatchers, closeAuthPopup, t],
  );

  const resetAuth = useCallback(() => {
    authSessionIdRef.current += 1;
    clearAuthWatchers();
    closeAuthPopup();
    setAuthPhase("idle");
    setAuthError(null);
  }, [clearAuthWatchers, closeAuthPopup]);

  const cancelConnectSpotify = useCallback(() => {
    finishAuthFailure(t("lobby.spotify.authCancelled"));
  }, [finishAuthFailure, t]);

  const connectSpotify = useCallback(() => {
    if (!roomId) return;

    authSessionIdRef.current += 1;
    const sessionId = authSessionIdRef.current;

    clearAuthWatchers();
    closeAuthPopup();
    setAuthPhase("connecting");
    setAuthError(null);

    const popup = window.open("about:blank", "spotify-auth", "popup,width=520,height=720");
    if (!popup) {
      setAuthPhase("error");
      setAuthError(t("lobby.spotify.popupBlocked"));
      return;
    }

    authPopupRef.current = popup;

    popupPollTimerRef.current = window.setInterval(() => {
      if (authSessionIdRef.current !== sessionId) return;
      if (!authPopupRef.current || !authPopupRef.current.closed) return;

      authPopupRef.current = null;
      // Brief grace so a successful callback can win over popup self-close.
      window.setTimeout(() => {
        if (authSessionIdRef.current !== sessionId) return;
        finishAuthFailure(t("lobby.spotify.authCancelled"));
      }, 750);
    }, AUTH_POPUP_POLL_MS);

    authTimeoutTimerRef.current = window.setTimeout(() => {
      if (authSessionIdRef.current !== sessionId) return;
      finishAuthFailure(t("lobby.spotify.authTimedOut"));
    }, AUTH_TIMEOUT_MS);

    void getSocketClient().then((socket) => {
      if (authSessionIdRef.current !== sessionId) return;

      const handleAuthUrl = (payload: SpotifyAuthUrlPayload) => {
        if (authSessionIdRef.current !== sessionId) return;
        if (!popup.closed) popup.location.href = payload.authUrl;
      };

      const handleSocketError = (payload: ServerErrorPayload) => {
        if (authSessionIdRef.current !== sessionId) return;
        if (payload.code !== "REQUEST_SPOTIFY_AUTH_URL_FAILED" && payload.code !== "INVALID_REQUEST_SPOTIFY_AUTH_URL_PAYLOAD") {
          return;
        }

        finishAuthFailure(payload.message || t("error.spotify.unknown"));
      };

      authUrlListenerRef.current = handleAuthUrl;
      authErrorListenerRef.current = handleSocketError;
      socket.once(ServerToClientEvent.SpotifyAuthUrl, handleAuthUrl);
      socket.on(ServerToClientEvent.Error, handleSocketError);
      socket.emit(ClientToServerEvent.RequestSpotifyAuthUrl, { roomId });
    });
  }, [clearAuthWatchers, closeAuthPopup, finishAuthFailure, roomId, t]);

  useEffect(() => {
    return () => {
      authSessionIdRef.current += 1;
      clearAuthWatchers();
      closeAuthPopup();
    };
  }, [clearAuthWatchers, closeAuthPopup]);

  return {
    accountType,
    authError,
    authPhase,
    cancelConnectSpotify,
    closeAuthPopup,
    connectSpotify,
    handleAuthResult,
    resetAuth,
  };
}
