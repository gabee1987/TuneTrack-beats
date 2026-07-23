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
    auth: {
      accountType: auth.accountType,
      authError: auth.authError,
      authPhase: auth.authPhase,
      cancelConnectSpotify: auth.cancelConnectSpotify,
      connectSpotify: auth.connectSpotify,
    },
    import: {
      clearCurrentPlaylist: playlistImport.clearCurrentPlaylist,
      importContentHeight: playlistImport.importContentHeight,
      importContentRef: playlistImport.importContentRef,
      importError: playlistImport.importError,
      importPhase: playlistImport.importPhase,
      importPlaylist: playlistImport.importPlaylist,
      importPlaylistSearchResult: playlistImport.importPlaylistSearchResult,
      playlistUrl: playlistImport.playlistUrl,
      setPlaylistUrl: playlistImport.setPlaylistUrl,
    },
    playlistSearch: {
      playlistSearchError: playlistSearch.playlistSearchError,
      playlistSearchPhase: playlistSearch.playlistSearchPhase,
      playlistSearchQuery: playlistSearch.playlistSearchQuery,
      playlistSearchResults: playlistSearch.playlistSearchResults,
      searchSpotifyPlaylists: playlistSearch.searchSpotifyPlaylists,
      setPlaylistSearchQuery: playlistSearch.setPlaylistSearchQuery,
    },
    smartSearch: {
      addSmartSearchTrackToQueue: smartSearch.addSmartSearchTrackToQueue,
      addSmartSearchTracksToQueue: smartSearch.addSmartSearchTracksToQueue,
      loadMoreSpotifyMusic: smartSearch.loadMoreSpotifyMusic,
      removeSmartSearchTracksFromQueue: smartSearch.removeSmartSearchTracksFromQueue,
      searchSpotifyMusic: smartSearch.searchSpotifyMusic,
      searchSpotifyMusicByType: smartSearch.searchSpotifyMusicByType,
      setSmartSearchQuery: smartSearch.setSmartSearchQuery,
      setSmartSearchType: smartSearch.setSmartSearchType,
      smartSearchError: smartSearch.smartSearchError,
      smartSearchHasMore: smartSearch.smartSearchHasMore,
      smartSearchHasSearched: smartSearch.smartSearchHasSearched,
      smartSearchLoadMorePhase: smartSearch.smartSearchLoadMorePhase,
      smartSearchPhase: smartSearch.smartSearchPhase,
      smartSearchQuery: smartSearch.smartSearchQuery,
      smartSearchQueuedTrackIds,
      smartSearchResults: smartSearch.smartSearchResults,
      smartSearchType: smartSearch.smartSearchType,
    },
    openedPlaylist: {
      applyOpenedPlaylistTracks: openedPlaylist.applyOpenedPlaylistTracks,
      closeOpenedPlaylist: openedPlaylist.closeOpenedPlaylist,
      openSmartSearchPlaylist: openedPlaylist.openSmartSearchPlaylist,
      openedPlaylist: openedPlaylist.openedPlaylist,
      openedPlaylistError: openedPlaylist.openedPlaylistError,
      openedPlaylistPhase: openedPlaylist.openedPlaylistPhase,
      queuedTrackIds,
      removeOpenedPlaylistTrack: openedPlaylist.removeOpenedPlaylistTrack,
      removeOpenedPlaylistTracksFromQueue: openedPlaylist.removeOpenedPlaylistTracksFromQueue,
      updateOpenedPlaylistTrack: openedPlaylist.updateOpenedPlaylistTrack,
    },
    candidates: {
      candidateError: candidates.candidateError,
      candidatePhase: candidates.candidatePhase,
      candidateSessionId: candidates.candidateSessionId,
      candidateSourceSummary: candidates.candidateSourceSummary,
      candidateTracks: candidates.candidateTracks,
      discardGeneratedCandidates: candidates.discardGeneratedCandidates,
      generateCandidatesFromPreset: candidates.generateCandidatesFromPreset,
      generateCandidatesFromSelectedPlaylists: candidates.generateCandidatesFromSelectedPlaylists,
      removeCandidateTrack: candidates.removeCandidateTrack,
      selectedSpotifyPlaylistIds: candidates.selectedSpotifyPlaylistIds,
      toggleSpotifyPlaylistSelection: candidates.toggleSpotifyPlaylistSelection,
      updateCandidateTrack: candidates.updateCandidateTrack,
      useGeneratedCandidates: candidates.useGeneratedCandidates,
    },
    savedPlaylists: {
      cancelRenamePlaylist: savedPlaylists.cancelRenamePlaylist,
      cancelSavePlaylist: savedPlaylists.cancelSavePlaylist,
      confirmOverwrite: savedPlaylists.confirmOverwrite,
      confirmRenamePlaylist: savedPlaylists.confirmRenamePlaylist,
      confirmSavePlaylist: savedPlaylists.confirmSavePlaylist,
      deleteSelectedSavedPlaylist: savedPlaylists.deleteSelectedSavedPlaylist,
      generatedPlaylistMessage,
      isOverwritePromptActive: savedPlaylists.isOverwritePromptActive,
      isSavingWithName: savedPlaylists.isSavingWithName,
      loadedSavedPlaylistId,
      renameError: savedPlaylists.renameError,
      renameInputValue: savedPlaylists.renameInputValue,
      renamingPlaylistId: savedPlaylists.renamingPlaylistId,
      saveCurrentPlaylist: savedPlaylists.saveCurrentPlaylist,
      saveName: savedPlaylists.saveName,
      saveNameError: savedPlaylists.saveNameError,
      savedPlaylistMessage,
      savedPlaylists: savedPlaylists.savedPlaylists,
      selectedSavedPlaylistId: savedPlaylists.selectedSavedPlaylistId,
      setRenameInputValue: savedPlaylists.setRenameInputValue,
      setSaveName: savedPlaylists.setSaveName,
      setSelectedSavedPlaylistId: savedPlaylists.setSelectedSavedPlaylistId,
      startRenamePlaylist: savedPlaylists.startRenamePlaylist,
      switchToSaveAsNew: savedPlaylists.switchToSaveAsNew,
    },
    queue: {
      closeEditModal: () => setIsEditModalOpen(false),
      isEditModalOpen,
      openEditModal: () => setIsEditModalOpen(true),
    },
  };
}
