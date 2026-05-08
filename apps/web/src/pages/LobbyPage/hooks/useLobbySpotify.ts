import {
  ClientToServerEvent,
  ServerToClientEvent,
  type SpotifyAccountType,
  type SpotifyAuthResultPayload,
  type ImportPlaylistResultPayload,
  type PlaylistTracksPayload,
  type SpotifyAuthUrlPayload,
} from "@tunetrack/shared";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "../../../features/i18n";
import {
  localizePlaylistImportError,
  localizeSpotifyAuthError,
} from "../../../features/i18n/localizedErrors";
import {
  deleteSavedPlaylist,
  listSavedPlaylists,
  renameSavedPlaylist,
  savePlaylist,
  updateSavedPlaylist,
  type SavedPlaylist,
} from "../../../services/savedPlaylists/savedPlaylists";
import { getSocketClient } from "../../../services/socket/socketClient";
import type { PublicTrackInfo } from "@tunetrack/shared";

type AuthPhase = "idle" | "connecting" | "error";
type ImportPhase = "idle" | "importing" | "error";

export interface UseLobbySpotifyResult {
  accountType: SpotifyAccountType | null;
  authError: string | null;
  authPhase: AuthPhase;
  cancelRenamePlaylist: () => void;
  cancelSavePlaylist: () => void;
  closeEditModal: () => void;
  confirmOverwrite: () => void;
  confirmRenamePlaylist: () => void;
  confirmSavePlaylist: () => void;
  connectSpotify: () => void;
  importContentHeight: number;
  importContentRef: React.RefObject<HTMLDivElement>;
  importError: string | null;
  importPhase: ImportPhase;
  importPlaylist: () => void;
  isEditModalOpen: boolean;
  isOverwritePromptActive: boolean;
  isSavingWithName: boolean;
  loadedSavedPlaylistId: string | null;
  openEditModal: () => void;
  playlistUrl: string;
  renameError: string | null;
  renameInputValue: string;
  renamingPlaylistId: string | null;
  saveNameError: string | null;
  saveName: string;
  savedPlaylistMessage: string | null;
  savedPlaylists: SavedPlaylist[];
  selectedSavedPlaylistId: string;
  deleteSelectedSavedPlaylist: () => void;
  saveCurrentPlaylist: () => void;
  setRenameInputValue: (name: string) => void;
  setSaveName: (name: string) => void;
  setSelectedSavedPlaylistId: (playlistId: string) => void;
  setPlaylistUrl: (url: string) => void;
  startRenamePlaylist: (playlistId: string) => void;
  switchToSaveAsNew: () => void;
}

export function useLobbySpotify(): UseLobbySpotifyResult {
  const { t } = useI18n();
  const { roomId } = useParams<{ roomId: string }>();

  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<SpotifyAccountType | null>(null);

  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>(() =>
    listSavedPlaylists(),
  );
  const [selectedSavedPlaylistId, setSelectedSavedPlaylistId] = useState("");
  const [savedPlaylistMessage, setSavedPlaylistMessage] = useState<string | null>(null);
  const [loadedSavedPlaylistId, setLoadedSavedPlaylistId] = useState<string | null>(null);

  const [isSavingWithName, setIsSavingWithName] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNameError, setSaveNameError] = useState<string | null>(null);
  const [isOverwritePromptActive, setIsOverwritePromptActive] = useState(false);
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const importContentRef = useRef<HTMLDivElement>(null);
  const authPopupRef = useRef<Window | null>(null);
  const pendingImportPlaylistUrlRef = useRef("");
  const pendingSaveTracksRef = useRef<PublicTrackInfo[] | null>(null);
  const currentPlaylistNameRef = useRef<string | undefined>(undefined);
  const pendingLoadConfirmCleanupRef = useRef<(() => void) | null>(null);
  const [importContentHeight, setImportContentHeight] = useState(0);
  const [currentPlaylistSourceUrl, setCurrentPlaylistSourceUrl] = useState("");

  const closeAuthPopup = useCallback(() => {
    const popup = authPopupRef.current;
    if (popup && !popup.closed) popup.close();
    authPopupRef.current = null;
  }, []);

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
    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    void getSocketClient().then((socket) => {
      if (isDisposed) return;

      function handleAuthResult(payload: SpotifyAuthResultPayload) {
        if (payload.success) {
          setAuthPhase("idle");
          setAuthError(null);
          setAccountType(payload.accountType);
        } else {
          setAuthPhase("error");
          setAuthError(localizeSpotifyAuthError(t, payload));
        }
      }

      function handleImportResult(payload: ImportPlaylistResultPayload) {
        if (payload.success) {
          setImportPhase("idle");
          setImportError(null);
          setCurrentPlaylistSourceUrl(pendingImportPlaylistUrlRef.current);
          currentPlaylistNameRef.current = payload.playlistName;
          setLoadedSavedPlaylistId(null);
          setPlaylistUrl("");
        } else {
          setImportPhase("error");
          setImportError(localizePlaylistImportError(t, payload));
        }
      }

      function handleRoomClosed() {
        closeAuthPopup();
        pendingLoadConfirmCleanupRef.current?.();
        pendingLoadConfirmCleanupRef.current = null;
        setAuthPhase("idle");
        setImportPhase("idle");
        setAuthError(null);
        setImportError(null);
        setIsEditModalOpen(false);
        setIsSavingWithName(false);
        setIsOverwritePromptActive(false);
        setSaveName("");
        setSaveNameError(null);
        setRenamingPlaylistId(null);
        setRenameInputValue("");
        setRenameError(null);
        setLoadedSavedPlaylistId(null);
        pendingSaveTracksRef.current = null;
      }

      socket.on(ServerToClientEvent.SpotifyAuthResult, handleAuthResult);
      socket.on(ServerToClientEvent.PlaylistImportResult, handleImportResult);
      socket.on(ServerToClientEvent.RoomClosed, handleRoomClosed);

      cleanup = () => {
        socket.off(ServerToClientEvent.SpotifyAuthResult, handleAuthResult);
        socket.off(ServerToClientEvent.PlaylistImportResult, handleImportResult);
        socket.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      };
    });

    return () => {
      isDisposed = true;
      cleanup?.();
      closeAuthPopup();
    };
  }, [closeAuthPopup, t]);

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

  function importPlaylist() {
    if (!roomId || !playlistUrl.trim()) return;

    setImportPhase("importing");
    setImportError(null);
    pendingImportPlaylistUrlRef.current = playlistUrl.trim();

    void getSocketClient().then((socket) => {
      socket.emit(ClientToServerEvent.ImportPlaylist, {
        roomId,
        playlistUrl: pendingImportPlaylistUrlRef.current,
      });
    });
  }

  function saveCurrentPlaylist() {
    if (!roomId) return;

    void getCurrentPlaylistTracks(roomId).then((tracks) => {
      if (tracks.length === 0) {
        setSavedPlaylistMessage(t("lobby.spotify.savePlaylistNoTracks"));
        return;
      }

      pendingSaveTracksRef.current = tracks;

      if (loadedSavedPlaylistId) {
        setIsOverwritePromptActive(true);
      } else {
        const defaultName =
          currentPlaylistNameRef.current ??
          t("lobby.spotify.savedPlaylistDefaultName", { count: savedPlaylists.length + 1 });
        setSaveName(defaultName);
        setIsSavingWithName(true);
      }
    });
  }

  function confirmOverwrite() {
    const tracks = pendingSaveTracksRef.current;
    if (!tracks || !loadedSavedPlaylistId) return;

    const nextPlaylists = updateSavedPlaylist(loadedSavedPlaylistId, tracks);
    setSavedPlaylists(nextPlaylists);

    pendingSaveTracksRef.current = null;
    setIsOverwritePromptActive(false);
    setSavedPlaylistMessage(t("lobby.spotify.savedPlaylistOverwritten"));
  }

  function switchToSaveAsNew() {
    setIsOverwritePromptActive(false);
    const defaultName =
      currentPlaylistNameRef.current ??
      t("lobby.spotify.savedPlaylistDefaultName", { count: savedPlaylists.length + 1 });
    setSaveName(defaultName);
    setIsSavingWithName(true);
  }

  function handleSetSaveName(name: string) {
    setSaveName(name);
    setSaveNameError(null);
  }

  function handleSetRenameInputValue(name: string) {
    setRenameInputValue(name);
    setRenameError(null);
  }

  function confirmSavePlaylist() {
    const tracks = pendingSaveTracksRef.current;
    if (!tracks) return;

    const name =
      saveName.trim() ||
      t("lobby.spotify.savedPlaylistDefaultName", { count: savedPlaylists.length + 1 });

    const isDuplicate = savedPlaylists.some(
      (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (isDuplicate) {
      setSaveNameError(t("lobby.spotify.duplicatePlaylistName"));
      return;
    }

    const savedPlaylist = savePlaylist({
      name,
      tracks,
      ...(currentPlaylistSourceUrl ? { sourcePlaylistUrl: currentPlaylistSourceUrl } : {}),
    });

    pendingSaveTracksRef.current = null;
    setIsSavingWithName(false);
    setSaveName("");
    setSaveNameError(null);

    if (!savedPlaylist) return;

    const nextPlaylists = listSavedPlaylists();
    setSavedPlaylists(nextPlaylists);
    setSelectedSavedPlaylistId(savedPlaylist.id);
    setLoadedSavedPlaylistId(savedPlaylist.id);
    setSavedPlaylistMessage(t("lobby.spotify.savedPlaylistSaved"));
  }

  function cancelSavePlaylist() {
    pendingSaveTracksRef.current = null;
    setIsSavingWithName(false);
    setIsOverwritePromptActive(false);
    setSaveName("");
    setSaveNameError(null);
  }

  function startRenamePlaylist(playlistId: string) {
    const playlist = savedPlaylists.find((p) => p.id === playlistId);
    if (!playlist) return;
    setRenamingPlaylistId(playlistId);
    setRenameInputValue(playlist.name);
  }

  function confirmRenamePlaylist() {
    if (!renamingPlaylistId) return;

    const name = renameInputValue.trim();
    const isDuplicate = savedPlaylists.some(
      (p) => p.id !== renamingPlaylistId && p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (isDuplicate) {
      setRenameError(t("lobby.spotify.duplicatePlaylistName"));
      return;
    }

    const nextPlaylists = renameSavedPlaylist(renamingPlaylistId, renameInputValue);
    setSavedPlaylists(nextPlaylists);
    setRenamingPlaylistId(null);
    setRenameInputValue("");
    setRenameError(null);
    setSavedPlaylistMessage(t("lobby.spotify.playlistRenamed"));
  }

  function cancelRenamePlaylist() {
    setRenamingPlaylistId(null);
    setRenameInputValue("");
    setRenameError(null);
  }

  function handleSelectSavedPlaylist(playlistId: string) {
    setSelectedSavedPlaylistId(playlistId);
    setIsOverwritePromptActive(false);
    setIsSavingWithName(false);
    setSaveName("");
    setSaveNameError(null);
    setSavedPlaylistMessage(null);
    pendingLoadConfirmCleanupRef.current?.();
    pendingLoadConfirmCleanupRef.current = null;
    pendingSaveTracksRef.current = null;

    if (!roomId || !playlistId) return;

    const playlist = savedPlaylists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const { name: playlistName, tracks: playlistTracks } = playlist;

    void getSocketClient().then((socket) => {
      function handleLoadConfirmed() {
        pendingLoadConfirmCleanupRef.current = null;
        setLoadedSavedPlaylistId(playlistId);
        setSavedPlaylistMessage(t("lobby.spotify.savedPlaylistLoaded", { name: playlistName }));
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
      pendingLoadConfirmCleanupRef.current = () =>
        socket.off(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);

      socket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
        roomId,
        tracks: playlistTracks,
      });
    });
  }

  function deleteSelectedSavedPlaylist() {
    if (!selectedSavedPlaylistId) return;

    if (loadedSavedPlaylistId === selectedSavedPlaylistId) {
      setLoadedSavedPlaylistId(null);
    }

    const nextPlaylists = deleteSavedPlaylist(selectedSavedPlaylistId);
    setSavedPlaylists(nextPlaylists);
    setSelectedSavedPlaylistId(nextPlaylists[0]?.id ?? "");
    setSavedPlaylistMessage(t("lobby.spotify.savedPlaylistDeleted"));
  }

  return {
    accountType,
    authError,
    authPhase,
    cancelRenamePlaylist,
    cancelSavePlaylist,
    closeEditModal: () => setIsEditModalOpen(false),
    confirmOverwrite,
    confirmRenamePlaylist,
    confirmSavePlaylist,
    connectSpotify,
    importContentHeight,
    importContentRef,
    importError,
    importPhase,
    importPlaylist,
    isEditModalOpen,
    isOverwritePromptActive,
    isSavingWithName,
    loadedSavedPlaylistId,
    openEditModal: () => setIsEditModalOpen(true),
    playlistUrl,
    renameError,
    renameInputValue,
    renamingPlaylistId,
    saveNameError,
    saveName,
    savedPlaylistMessage,
    savedPlaylists,
    selectedSavedPlaylistId,
    deleteSelectedSavedPlaylist,
    saveCurrentPlaylist,
    setRenameInputValue: handleSetRenameInputValue,
    setSaveName: handleSetSaveName,
    setSelectedSavedPlaylistId: handleSelectSavedPlaylist,
    setPlaylistUrl,
    startRenamePlaylist,
    switchToSaveAsNew,
  };
}

async function getCurrentPlaylistTracks(roomId: string) {
  const socket = await getSocketClient();

  return new Promise<PlaylistTracksPayload["tracks"]>((resolve) => {
    socket.once(ServerToClientEvent.PlaylistTracks, (payload: PlaylistTracksPayload) => {
      resolve(payload.tracks);
    });
    socket.emit(ClientToServerEvent.GetPlaylistTracks, { roomId });
  });
}
