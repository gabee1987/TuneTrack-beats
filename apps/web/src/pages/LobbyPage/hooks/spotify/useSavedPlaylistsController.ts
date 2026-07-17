import { ServerToClientEvent, ClientToServerEvent, type PublicTrackInfo } from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useI18n } from "../../../../features/i18n";
import {
  deleteSavedPlaylist,
  listSavedPlaylists,
  renameSavedPlaylist,
  savePlaylist,
  updateSavedPlaylist,
} from "../../../../services/savedPlaylists/savedPlaylists";
import { getSocketClient } from "../../../../services/socket/socketClient";
import { getCurrentPlaylistTracks } from "./spotifyQueueTrackIds";

interface UseSavedPlaylistsControllerParams {
  currentPlaylistNameRef: MutableRefObject<string | undefined>;
  currentPlaylistSourceUrl: string;
  loadedSavedPlaylistId: string | null;
  roomId: string | undefined;
  setLoadedSavedPlaylistId: (playlistId: string | null) => void;
  setSavedPlaylistMessage: (message: string | null) => void;
}

export function useSavedPlaylistsController({
  currentPlaylistNameRef,
  currentPlaylistSourceUrl,
  loadedSavedPlaylistId,
  roomId,
  setLoadedSavedPlaylistId,
  setSavedPlaylistMessage,
}: UseSavedPlaylistsControllerParams) {
  const { t } = useI18n();
  const [savedPlaylists, setSavedPlaylists] = useState(() => listSavedPlaylists());
  const [selectedSavedPlaylistId, setSelectedSavedPlaylistIdState] = useState("");
  const [isSavingWithName, setIsSavingWithName] = useState(false);
  const [saveName, setSaveNameState] = useState("");
  const [saveNameError, setSaveNameError] = useState<string | null>(null);
  const [isOverwritePromptActive, setIsOverwritePromptActive] = useState(false);
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValueState] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const pendingSaveTracksRef = useRef<PublicTrackInfo[] | null>(null);
  const pendingLoadConfirmCleanupRef = useRef<(() => void) | null>(null);

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
        setSaveNameState(defaultName);
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
    setSaveNameState(defaultName);
    setIsSavingWithName(true);
  }

  function setSaveName(name: string) {
    setSaveNameState(name);
    setSaveNameError(null);
  }

  function setRenameInputValue(name: string) {
    setRenameInputValueState(name);
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
    setSaveNameState("");
    setSaveNameError(null);

    if (!savedPlaylist) return;

    const nextPlaylists = listSavedPlaylists();
    setSavedPlaylists(nextPlaylists);
    setSelectedSavedPlaylistIdState(savedPlaylist.id);
    setLoadedSavedPlaylistId(savedPlaylist.id);
    setSavedPlaylistMessage(t("lobby.spotify.savedPlaylistSaved"));
  }

  function cancelSavePlaylist() {
    pendingSaveTracksRef.current = null;
    setIsSavingWithName(false);
    setIsOverwritePromptActive(false);
    setSaveNameState("");
    setSaveNameError(null);
  }

  function startRenamePlaylist(playlistId: string) {
    const playlist = savedPlaylists.find((p) => p.id === playlistId);
    if (!playlist) return;
    setRenamingPlaylistId(playlistId);
    setRenameInputValueState(playlist.name);
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
    setRenameInputValueState("");
    setRenameError(null);
    setSavedPlaylistMessage(t("lobby.spotify.playlistRenamed"));
  }

  function cancelRenamePlaylist() {
    setRenamingPlaylistId(null);
    setRenameInputValueState("");
    setRenameError(null);
  }

  function handleSelectSavedPlaylist(playlistId: string) {
    setSelectedSavedPlaylistIdState(playlistId);
    setIsOverwritePromptActive(false);
    setIsSavingWithName(false);
    setSaveNameState("");
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
    setSelectedSavedPlaylistIdState(nextPlaylists[0]?.id ?? "");
    setSavedPlaylistMessage(t("lobby.spotify.savedPlaylistDeleted"));
  }

  const resetSavedPlaylists = useCallback(() => {
    pendingLoadConfirmCleanupRef.current?.();
    pendingLoadConfirmCleanupRef.current = null;
    setIsSavingWithName(false);
    setIsOverwritePromptActive(false);
    setSaveNameState("");
    setSaveNameError(null);
    setRenamingPlaylistId(null);
    setRenameInputValueState("");
    setRenameError(null);
    pendingSaveTracksRef.current = null;
  }, []);

  return {
    cancelRenamePlaylist,
    cancelSavePlaylist,
    confirmOverwrite,
    confirmRenamePlaylist,
    confirmSavePlaylist,
    deleteSelectedSavedPlaylist,
    isOverwritePromptActive,
    isSavingWithName,
    renameError,
    renameInputValue,
    renamingPlaylistId,
    resetSavedPlaylists,
    saveCurrentPlaylist,
    saveName,
    saveNameError,
    savedPlaylists,
    selectedSavedPlaylistId,
    setRenameInputValue,
    setSaveName,
    setSelectedSavedPlaylistId: handleSelectSavedPlaylist,
    startRenamePlaylist,
    switchToSaveAsNew,
  };
}
