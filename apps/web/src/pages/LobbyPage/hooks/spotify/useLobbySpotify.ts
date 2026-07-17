import { ServerToClientEvent, type PlaylistTracksPayload } from "@tunetrack/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { UseLobbySpotifyResult } from "./lobbySpotify.types";
import {
  getQueuedTrackIdsFromPlaylistTracks,
  getQueuedSpotifyTrackIdsFromPlaylistTracks,
} from "./spotifyQueueTrackIds";
import { useSavedPlaylistsController } from "./useSavedPlaylistsController";
import { useSpotifyAuth } from "./useSpotifyAuth";
import { useSpotifyCandidates } from "./useSpotifyCandidates";
import { useSpotifyOpenedPlaylist } from "./useSpotifyOpenedPlaylist";
import { useSpotifyPlaylistImport } from "./useSpotifyPlaylistImport";
import { useSpotifyPlaylistSearch } from "./useSpotifyPlaylistSearch";
import { useSpotifySmartSearch } from "./useSpotifySmartSearch";

export function useLobbySpotify(): UseLobbySpotifyResult {
  const { roomId } = useParams<{ roomId: string }>();

  const [queuedTrackIds, setQueuedTrackIds] = useState<Set<string>>(() => new Set());
  const [smartSearchQueuedTrackIds, setSmartSearchQueuedTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [savedPlaylistMessage, setSavedPlaylistMessage] = useState<string | null>(null);
  const [generatedPlaylistMessage, setGeneratedPlaylistMessage] = useState<string | null>(null);
  const [loadedSavedPlaylistId, setLoadedSavedPlaylistId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentPlaylistNameRef = useRef<string | undefined>(undefined);
  const generatedPlaylistMessageTimerRef = useRef<number | null>(null);

  const showGeneratedPlaylistMessage = useCallback((message: string) => {
    if (generatedPlaylistMessageTimerRef.current) {
      window.clearTimeout(generatedPlaylistMessageTimerRef.current);
    }

    setGeneratedPlaylistMessage(message);
    generatedPlaylistMessageTimerRef.current = window.setTimeout(() => {
      setGeneratedPlaylistMessage(null);
      generatedPlaylistMessageTimerRef.current = null;
    }, 4200);
  }, []);

  const auth = useSpotifyAuth(roomId);

  const openedPlaylist = useSpotifyOpenedPlaylist({
    currentPlaylistNameRef,
    roomId,
    setQueuedTrackIds,
    setSavedPlaylistMessage,
    setSmartSearchQueuedTrackIds,
  });

  const candidates = useSpotifyCandidates({
    currentPlaylistNameRef,
    roomId,
    setGeneratedPlaylistMessage,
    setSavedPlaylistMessage,
    showGeneratedPlaylistMessage,
  });

  const playlistSearch = useSpotifyPlaylistSearch({
    roomId,
    setCandidateError: candidates.setCandidateError,
    setGeneratedPlaylistMessage,
    setSelectedSpotifyPlaylistIds: candidates.setSelectedSpotifyPlaylistIds,
  });

  const playlistImport = useSpotifyPlaylistImport({
    clearPlaylistSearch: playlistSearch.clearPlaylistSearch,
    currentPlaylistNameRef,
    roomId,
    setLoadedSavedPlaylistId,
    setQueuedTrackIds,
    setSavedPlaylistMessage,
    setSmartSearchQueuedTrackIds,
  });

  const smartSearch = useSpotifySmartSearch({
    closeOpenedPlaylist: openedPlaylist.closeOpenedPlaylist,
    roomId,
    setQueuedTrackIds,
    setSavedPlaylistMessage,
    setSmartSearchQueuedTrackIds,
    smartSearchQueuedTrackIds,
  });

  const savedPlaylists = useSavedPlaylistsController({
    currentPlaylistNameRef,
    currentPlaylistSourceUrl: playlistImport.currentPlaylistSourceUrl,
    loadedSavedPlaylistId,
    roomId,
    setLoadedSavedPlaylistId,
    setSavedPlaylistMessage,
  });

  const handleRoomClosed = useCallback(() => {
    auth.closeAuthPopup();
    auth.resetAuth();
    playlistImport.resetImport();
    playlistSearch.resetPlaylistSearch();
    smartSearch.resetSmartSearch();
    setQueuedTrackIds(new Set());
    setSmartSearchQueuedTrackIds(new Set());
    openedPlaylist.resetOpenedPlaylist();
    candidates.resetCandidates();
    setGeneratedPlaylistMessage(null);
    setIsEditModalOpen(false);
    savedPlaylists.resetSavedPlaylists();
    setLoadedSavedPlaylistId(null);
  }, [
    auth.closeAuthPopup,
    auth.resetAuth,
    candidates.resetCandidates,
    openedPlaylist.resetOpenedPlaylist,
    playlistImport.resetImport,
    playlistSearch.resetPlaylistSearch,
    savedPlaylists.resetSavedPlaylists,
    smartSearch.resetSmartSearch,
  ]);

  useEffect(() => {
    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    void getSocketClient().then((socket) => {
      if (isDisposed) return;

      function handlePlaylistTracks(payload: PlaylistTracksPayload) {
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getQueuedSpotifyTrackIdsFromPlaylistTracks(payload.tracks));
      }

      socket.on(ServerToClientEvent.SpotifyAuthResult, auth.handleAuthResult);
      socket.on(ServerToClientEvent.PlaylistImportResult, playlistImport.handleImportResult);
      socket.on(ServerToClientEvent.PlaylistTracks, handlePlaylistTracks);
      socket.on(ServerToClientEvent.RoomClosed, handleRoomClosed);

      cleanup = () => {
        socket.off(ServerToClientEvent.SpotifyAuthResult, auth.handleAuthResult);
        socket.off(ServerToClientEvent.PlaylistImportResult, playlistImport.handleImportResult);
        socket.off(ServerToClientEvent.PlaylistTracks, handlePlaylistTracks);
        socket.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      };
    });

    return () => {
      isDisposed = true;
      cleanup?.();
      auth.closeAuthPopup();
      if (generatedPlaylistMessageTimerRef.current) {
        window.clearTimeout(generatedPlaylistMessageTimerRef.current);
        generatedPlaylistMessageTimerRef.current = null;
      }
    };
  }, [
    auth.closeAuthPopup,
    auth.handleAuthResult,
    handleRoomClosed,
    playlistImport.handleImportResult,
  ]);

  return {
    accountType: auth.accountType,
    authError: auth.authError,
    authPhase: auth.authPhase,
    cancelRenamePlaylist: savedPlaylists.cancelRenamePlaylist,
    cancelSavePlaylist: savedPlaylists.cancelSavePlaylist,
    clearCurrentPlaylist: playlistImport.clearCurrentPlaylist,
    closeEditModal: () => setIsEditModalOpen(false),
    confirmOverwrite: savedPlaylists.confirmOverwrite,
    confirmRenamePlaylist: savedPlaylists.confirmRenamePlaylist,
    confirmSavePlaylist: savedPlaylists.confirmSavePlaylist,
    connectSpotify: auth.connectSpotify,
    discardGeneratedCandidates: candidates.discardGeneratedCandidates,
    importContentHeight: playlistImport.importContentHeight,
    importContentRef: playlistImport.importContentRef,
    importError: playlistImport.importError,
    importPhase: playlistImport.importPhase,
    importPlaylist: playlistImport.importPlaylist,
    importPlaylistSearchResult: playlistImport.importPlaylistSearchResult,
    isEditModalOpen,
    isOverwritePromptActive: savedPlaylists.isOverwritePromptActive,
    isSavingWithName: savedPlaylists.isSavingWithName,
    loadedSavedPlaylistId,
    openEditModal: () => setIsEditModalOpen(true),
    playlistUrl: playlistImport.playlistUrl,
    playlistSearchError: playlistSearch.playlistSearchError,
    playlistSearchPhase: playlistSearch.playlistSearchPhase,
    playlistSearchQuery: playlistSearch.playlistSearchQuery,
    playlistSearchResults: playlistSearch.playlistSearchResults,
    smartSearchError: smartSearch.smartSearchError,
    smartSearchHasSearched: smartSearch.smartSearchHasSearched,
    smartSearchHasMore: smartSearch.smartSearchHasMore,
    smartSearchLoadMorePhase: smartSearch.smartSearchLoadMorePhase,
    smartSearchPhase: smartSearch.smartSearchPhase,
    smartSearchQuery: smartSearch.smartSearchQuery,
    queuedTrackIds,
    smartSearchQueuedTrackIds,
    smartSearchResults: smartSearch.smartSearchResults,
    smartSearchType: smartSearch.smartSearchType,
    openedPlaylist: openedPlaylist.openedPlaylist,
    openedPlaylistError: openedPlaylist.openedPlaylistError,
    openedPlaylistPhase: openedPlaylist.openedPlaylistPhase,
    renameError: savedPlaylists.renameError,
    renameInputValue: savedPlaylists.renameInputValue,
    renamingPlaylistId: savedPlaylists.renamingPlaylistId,
    saveNameError: savedPlaylists.saveNameError,
    saveName: savedPlaylists.saveName,
    savedPlaylistMessage,
    generatedPlaylistMessage,
    savedPlaylists: savedPlaylists.savedPlaylists,
    selectedSavedPlaylistId: savedPlaylists.selectedSavedPlaylistId,
    selectedSpotifyPlaylistIds: candidates.selectedSpotifyPlaylistIds,
    candidateError: candidates.candidateError,
    candidatePhase: candidates.candidatePhase,
    candidateSessionId: candidates.candidateSessionId,
    candidateSourceSummary: candidates.candidateSourceSummary,
    candidateTracks: candidates.candidateTracks,
    deleteSelectedSavedPlaylist: savedPlaylists.deleteSelectedSavedPlaylist,
    generateCandidatesFromSelectedPlaylists: candidates.generateCandidatesFromSelectedPlaylists,
    generateCandidatesFromPreset: candidates.generateCandidatesFromPreset,
    removeCandidateTrack: candidates.removeCandidateTrack,
    closeOpenedPlaylist: openedPlaylist.closeOpenedPlaylist,
    saveCurrentPlaylist: savedPlaylists.saveCurrentPlaylist,
    addSmartSearchTrackToQueue: smartSearch.addSmartSearchTrackToQueue,
    addSmartSearchTracksToQueue: smartSearch.addSmartSearchTracksToQueue,
    applyOpenedPlaylistTracks: openedPlaylist.applyOpenedPlaylistTracks,
    openSmartSearchPlaylist: openedPlaylist.openSmartSearchPlaylist,
    removeOpenedPlaylistTrack: openedPlaylist.removeOpenedPlaylistTrack,
    removeOpenedPlaylistTracksFromQueue: openedPlaylist.removeOpenedPlaylistTracksFromQueue,
    removeSmartSearchTracksFromQueue: smartSearch.removeSmartSearchTracksFromQueue,
    loadMoreSpotifyMusic: smartSearch.loadMoreSpotifyMusic,
    searchSpotifyMusic: smartSearch.searchSpotifyMusic,
    searchSpotifyMusicByType: smartSearch.searchSpotifyMusicByType,
    searchSpotifyPlaylists: playlistSearch.searchSpotifyPlaylists,
    setPlaylistSearchQuery: playlistSearch.setPlaylistSearchQuery,
    setSmartSearchQuery: smartSearch.setSmartSearchQuery,
    setSmartSearchType: smartSearch.setSmartSearchType,
    setRenameInputValue: savedPlaylists.setRenameInputValue,
    setSaveName: savedPlaylists.setSaveName,
    setSelectedSavedPlaylistId: savedPlaylists.setSelectedSavedPlaylistId,
    setPlaylistUrl: playlistImport.setPlaylistUrl,
    startRenamePlaylist: savedPlaylists.startRenamePlaylist,
    switchToSaveAsNew: savedPlaylists.switchToSaveAsNew,
    toggleSpotifyPlaylistSelection: candidates.toggleSpotifyPlaylistSelection,
    updateCandidateTrack: candidates.updateCandidateTrack,
    updateOpenedPlaylistTrack: openedPlaylist.updateOpenedPlaylistTrack,
    useGeneratedCandidates: candidates.useGeneratedCandidates,
  };
}
