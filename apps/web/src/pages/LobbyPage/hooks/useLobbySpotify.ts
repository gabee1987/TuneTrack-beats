import {
  ClientToServerEvent,
  ServerToClientEvent,
  type SpotifyAccountType,
  type SpotifyAuthResultPayload,
  type ImportPlaylistResultPayload,
  type SpotifyAuthUrlPayload,
} from "@tunetrack/shared";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocketClient } from "../../../services/socket/socketClient";

type AuthPhase = "idle" | "connecting" | "error";
type ImportPhase = "idle" | "importing" | "error";

export interface UseLobbySpotifyResult {
  accountType: SpotifyAccountType | null;
  authError: string | null;
  authPhase: AuthPhase;
  closeEditModal: () => void;
  connectSpotify: () => void;
  importContentHeight: number;
  importContentRef: React.RefObject<HTMLDivElement>;
  importError: string | null;
  importPhase: ImportPhase;
  importPlaylist: () => void;
  isEditModalOpen: boolean;
  openEditModal: () => void;
  playlistUrl: string;
  setPlaylistUrl: (url: string) => void;
}

export function useLobbySpotify(): UseLobbySpotifyResult {
  const { roomId } = useParams<{ roomId: string }>();

  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<SpotifyAccountType | null>(null);

  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const importContentRef = useRef<HTMLDivElement>(null);
  const [importContentHeight, setImportContentHeight] = useState(0);

  useLayoutEffect(() => {
    const el = importContentRef.current;
    if (!el) return;

    const update = () => setImportContentHeight(el.scrollHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    void getSocketClient().then((socket) => {
      function handleAuthResult(payload: SpotifyAuthResultPayload) {
        if (payload.success) {
          setAuthPhase("idle");
          setAuthError(null);
          setAccountType(payload.accountType);
        } else {
          setAuthPhase("error");
          setAuthError(payload.message);
        }
      }

      function handleImportResult(payload: ImportPlaylistResultPayload) {
        if (payload.success) {
          setImportPhase("idle");
          setImportError(null);
          setPlaylistUrl("");
        } else {
          setImportPhase("error");
          setImportError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyAuthResult, handleAuthResult);
      socket.on(ServerToClientEvent.PlaylistImportResult, handleImportResult);

      cleanup = () => {
        socket.off(ServerToClientEvent.SpotifyAuthResult, handleAuthResult);
        socket.off(ServerToClientEvent.PlaylistImportResult, handleImportResult);
      };
    });

    return () => cleanup?.();
  }, []);

  function connectSpotify() {
    if (!roomId) return;

    setAuthPhase("connecting");
    setAuthError(null);

    const popup = window.open("about:blank", "spotify-auth", "popup,width=520,height=720");
    if (!popup) {
      setAuthPhase("error");
      setAuthError("Popup was blocked. Please allow popups for this page and try again.");
      return;
    }

    void getSocketClient().then((socket) => {
      socket.once(ServerToClientEvent.SpotifyAuthUrl, (payload: SpotifyAuthUrlPayload) => {
        if (!popup.closed) {
          popup.location.href = payload.authUrl;
        }
      });
      socket.emit(ClientToServerEvent.RequestSpotifyAuthUrl, { roomId });
    });
  }

  function importPlaylist() {
    if (!roomId || !playlistUrl.trim()) return;

    setImportPhase("importing");
    setImportError(null);

    void getSocketClient().then((socket) => {
      socket.emit(ClientToServerEvent.ImportPlaylist, {
        roomId,
        playlistUrl: playlistUrl.trim(),
      });
    });
  }

  return {
    accountType,
    authError,
    authPhase,
    closeEditModal: () => setIsEditModalOpen(false),
    connectSpotify,
    importContentHeight,
    importContentRef,
    importError,
    importPhase,
    importPlaylist,
    isEditModalOpen,
    openEditModal: () => setIsEditModalOpen(true),
    playlistUrl,
    setPlaylistUrl,
  };
}
