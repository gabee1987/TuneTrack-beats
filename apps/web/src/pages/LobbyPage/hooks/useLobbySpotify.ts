import {
  ClientToServerEvent,
  ServerToClientEvent,
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  type SpotifyAccountType,
  type SpotifyAuthResultPayload,
  type ImportPlaylistResultPayload,
  type PlaylistTracksPayload,
  type SpotifyCandidatesAppliedPayload,
  type SpotifyCandidateSource,
  type SpotifyCandidatesGeneratedPayload,
  type SpotifyPlaylistSearchItem,
  type SpotifyPlaylistSearchResultPayload,
  type SpotifyPlaylistDetailPayload,
  type SpotifySmartSearchResult,
  type SpotifySmartSearchResultPayload,
  type SpotifySmartSearchTypeFilter,
  type SpotifyAuthUrlPayload,
  type SpotifyQuickPickPresetId,
  type PublicTrackInfo,
  type PlaylistQueueUpdateMode,
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

type AuthPhase = "idle" | "connecting" | "error";
type ImportPhase = "idle" | "importing" | "error";
type PlaylistSearchPhase = "idle" | "searching" | "error";
type SmartSearchPhase = "idle" | "searching" | "error";
type SmartSearchLoadMorePhase = "idle" | "loading";
type OpenedPlaylistPhase = "idle" | "loading" | "ready" | "applying" | "error";
type CandidatePhase = "idle" | "generating" | "ready" | "applying" | "error";

interface OpenedSpotifyPlaylist {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  totalFetched: number;
  filteredCount: number;
  tracks: PublicTrackInfo[];
}

export interface UseLobbySpotifyResult {
  accountType: SpotifyAccountType | null;
  authError: string | null;
  authPhase: AuthPhase;
  cancelRenamePlaylist: () => void;
  cancelSavePlaylist: () => void;
  clearCurrentPlaylist: () => void;
  closeEditModal: () => void;
  confirmOverwrite: () => void;
  confirmRenamePlaylist: () => void;
  confirmSavePlaylist: () => void;
  connectSpotify: () => void;
  discardGeneratedCandidates: () => void;
  importContentHeight: number;
  importContentRef: React.RefObject<HTMLDivElement>;
  importError: string | null;
  importPhase: ImportPhase;
  importPlaylist: () => void;
  importPlaylistSearchResult: (playlist: SpotifyPlaylistSearchItem) => void;
  isEditModalOpen: boolean;
  isOverwritePromptActive: boolean;
  isSavingWithName: boolean;
  loadedSavedPlaylistId: string | null;
  openEditModal: () => void;
  playlistUrl: string;
  playlistSearchError: string | null;
  playlistSearchPhase: PlaylistSearchPhase;
  playlistSearchQuery: string;
  playlistSearchResults: SpotifyPlaylistSearchItem[];
  smartSearchError: string | null;
  smartSearchHasSearched: boolean;
  smartSearchHasMore: boolean;
  smartSearchLoadMorePhase: SmartSearchLoadMorePhase;
  smartSearchPhase: SmartSearchPhase;
  smartSearchQuery: string;
  queuedTrackIds: ReadonlySet<string>;
  smartSearchQueuedTrackIds: ReadonlySet<string>;
  smartSearchResults: SpotifySmartSearchResult[];
  smartSearchType: SpotifySmartSearchTypeFilter;
  openedPlaylist: OpenedSpotifyPlaylist | null;
  openedPlaylistError: string | null;
  openedPlaylistPhase: OpenedPlaylistPhase;
  renameError: string | null;
  renameInputValue: string;
  renamingPlaylistId: string | null;
  saveNameError: string | null;
  saveName: string;
  savedPlaylistMessage: string | null;
  generatedPlaylistMessage: string | null;
  savedPlaylists: SavedPlaylist[];
  selectedSavedPlaylistId: string;
  selectedSpotifyPlaylistIds: Set<string>;
  candidateError: string | null;
  candidatePhase: CandidatePhase;
  candidateSessionId: string | null;
  candidateSourceSummary: string | null;
  candidateTracks: PublicTrackInfo[];
  deleteSelectedSavedPlaylist: () => void;
  generateCandidatesFromSelectedPlaylists: () => void;
  generateCandidatesFromPreset: (presetId: SpotifyQuickPickPresetId, targetCount?: number) => void;
  removeCandidateTrack: (trackId: string) => void;
  closeOpenedPlaylist: () => void;
  saveCurrentPlaylist: () => void;
  addSmartSearchTrackToQueue: (result: SpotifySmartSearchResult) => void;
  addSmartSearchTracksToQueue: (results: SpotifySmartSearchResult[]) => void;
  applyOpenedPlaylistTracks: (
    mode: PlaylistQueueUpdateMode,
    trackIds?: ReadonlySet<string>,
  ) => void;
  openSmartSearchPlaylist: (result: SpotifySmartSearchResult) => void;
  removeOpenedPlaylistTrack: (trackId: string) => void;
  removeOpenedPlaylistTracksFromQueue: (trackIds: ReadonlySet<string>) => void;
  removeSmartSearchTracksFromQueue: (results: SpotifySmartSearchResult[]) => void;
  loadMoreSpotifyMusic: () => void;
  searchSpotifyMusic: () => void;
  searchSpotifyMusicByType: (type: SpotifySmartSearchTypeFilter) => void;
  searchSpotifyPlaylists: () => void;
  setPlaylistSearchQuery: (query: string) => void;
  setSmartSearchQuery: (query: string) => void;
  setSmartSearchType: (type: SpotifySmartSearchTypeFilter) => void;
  setRenameInputValue: (name: string) => void;
  setSaveName: (name: string) => void;
  setSelectedSavedPlaylistId: (playlistId: string) => void;
  setPlaylistUrl: (url: string) => void;
  startRenamePlaylist: (playlistId: string) => void;
  switchToSaveAsNew: () => void;
  toggleSpotifyPlaylistSelection: (playlistId: string) => void;
  updateCandidateTrack: (trackId: string, patch: CandidateTrackUpdatePatch) => void;
  updateOpenedPlaylistTrack: (trackId: string, patch: CandidateTrackUpdatePatch) => void;
  useGeneratedCandidates: (mode?: PlaylistQueueUpdateMode) => void;
}

interface CandidateTrackUpdatePatch {
  title?: string;
  artist?: string;
  albumTitle?: string;
  releaseYear?: number;
  metadataStatus?: PublicTrackInfo["metadataStatus"];
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
  const [playlistSearchPhase, setPlaylistSearchPhase] = useState<PlaylistSearchPhase>("idle");
  const [playlistSearchError, setPlaylistSearchError] = useState<string | null>(null);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState("");
  const [playlistSearchResults, setPlaylistSearchResults] = useState<SpotifyPlaylistSearchItem[]>(
    [],
  );
  const [smartSearchPhase, setSmartSearchPhase] = useState<SmartSearchPhase>("idle");
  const [smartSearchLoadMorePhase, setSmartSearchLoadMorePhase] =
    useState<SmartSearchLoadMorePhase>("idle");
  const [smartSearchError, setSmartSearchError] = useState<string | null>(null);
  const [smartSearchHasSearched, setSmartSearchHasSearched] = useState(false);
  const [smartSearchHasMore, setSmartSearchHasMore] = useState(false);
  const [smartSearchNextOffset, setSmartSearchNextOffset] = useState(0);
  const [smartSearchQuery, setSmartSearchQuery] = useState("");
  const [smartSearchType, setSmartSearchType] = useState<SpotifySmartSearchTypeFilter>("track");
  const [smartSearchResults, setSmartSearchResults] = useState<SpotifySmartSearchResult[]>([]);
  const [queuedTrackIds, setQueuedTrackIds] = useState<Set<string>>(() => new Set());
  const [smartSearchQueuedTrackIds, setSmartSearchQueuedTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openedPlaylistPhase, setOpenedPlaylistPhase] = useState<OpenedPlaylistPhase>("idle");
  const [openedPlaylistError, setOpenedPlaylistError] = useState<string | null>(null);
  const [openedPlaylist, setOpenedPlaylist] = useState<OpenedSpotifyPlaylist | null>(null);
  const [selectedSpotifyPlaylistIds, setSelectedSpotifyPlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [candidatePhase, setCandidatePhase] = useState<CandidatePhase>("idle");
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateSessionId, setCandidateSessionId] = useState<string | null>(null);
  const [candidateSourceSummary, setCandidateSourceSummary] = useState<string | null>(null);
  const [candidateTracks, setCandidateTracks] = useState<PublicTrackInfo[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>(() => listSavedPlaylists());
  const [selectedSavedPlaylistId, setSelectedSavedPlaylistId] = useState("");
  const [savedPlaylistMessage, setSavedPlaylistMessage] = useState<string | null>(null);
  const [generatedPlaylistMessage, setGeneratedPlaylistMessage] = useState<string | null>(null);
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
  const generatedPlaylistMessageTimerRef = useRef<number | null>(null);
  const [importContentHeight, setImportContentHeight] = useState(0);
  const [currentPlaylistSourceUrl, setCurrentPlaylistSourceUrl] = useState("");

  const closeAuthPopup = useCallback(() => {
    const popup = authPopupRef.current;
    if (popup && !popup.closed) popup.close();
    authPopupRef.current = null;
  }, []);

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
          setSmartSearchQueuedTrackIds(new Set());
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
        setPlaylistSearchPhase("idle");
        setPlaylistSearchError(null);
        setPlaylistSearchResults([]);
        setSmartSearchPhase("idle");
        setSmartSearchLoadMorePhase("idle");
        setSmartSearchError(null);
        setSmartSearchHasSearched(false);
        setSmartSearchHasMore(false);
        setSmartSearchNextOffset(0);
        setSmartSearchResults([]);
        setQueuedTrackIds(new Set());
        setSmartSearchQueuedTrackIds(new Set());
        setOpenedPlaylistPhase("idle");
        setOpenedPlaylistError(null);
        setOpenedPlaylist(null);
        setSelectedSpotifyPlaylistIds(new Set());
        setCandidatePhase("idle");
        setCandidateError(null);
        setCandidateSessionId(null);
        setCandidateSourceSummary(null);
        setCandidateTracks([]);
        setGeneratedPlaylistMessage(null);
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

      function handlePlaylistTracks(payload: PlaylistTracksPayload) {
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getSmartSearchIdsFromPlaylistTracks(payload.tracks));
      }

      socket.on(ServerToClientEvent.SpotifyAuthResult, handleAuthResult);
      socket.on(ServerToClientEvent.PlaylistImportResult, handleImportResult);
      socket.on(ServerToClientEvent.PlaylistTracks, handlePlaylistTracks);
      socket.on(ServerToClientEvent.RoomClosed, handleRoomClosed);

      cleanup = () => {
        socket.off(ServerToClientEvent.SpotifyAuthResult, handleAuthResult);
        socket.off(ServerToClientEvent.PlaylistImportResult, handleImportResult);
        socket.off(ServerToClientEvent.PlaylistTracks, handlePlaylistTracks);
        socket.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      };
    });

    return () => {
      isDisposed = true;
      cleanup?.();
      closeAuthPopup();
      if (generatedPlaylistMessageTimerRef.current) {
        window.clearTimeout(generatedPlaylistMessageTimerRef.current);
        generatedPlaylistMessageTimerRef.current = null;
      }
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
    importPlaylistValue(playlistUrl);
  }

  function importPlaylistSearchResult(playlist: SpotifyPlaylistSearchItem) {
    importPlaylistValue(`https://open.spotify.com/playlist/${playlist.id}`);
    setPlaylistSearchResults([]);
    setPlaylistSearchQuery("");
  }

  function importPlaylistValue(value: string) {
    if (!roomId || !value.trim()) return;

    setImportPhase("importing");
    setImportError(null);
    pendingImportPlaylistUrlRef.current = value.trim();

    void getSocketClient().then((socket) => {
      socket.emit(ClientToServerEvent.ImportPlaylist, {
        roomId,
        playlistUrl: pendingImportPlaylistUrlRef.current,
      });
    });
  }

  function clearCurrentPlaylist() {
    if (!roomId) return;

    void getCurrentPlaylistTracks(roomId).then((tracks) => {
      if (tracks.length === 0) {
        setSavedPlaylistMessage(t("lobby.spotify.clearPlaylistNoTracks"));
        return;
      }

      void getSocketClient().then((socket) => {
        function handleClearConfirmed(payload: PlaylistTracksPayload) {
          socket.off(ServerToClientEvent.PlaylistTracks, handleClearConfirmed);
          setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
          setSmartSearchQueuedTrackIds(getSmartSearchIdsFromPlaylistTracks(payload.tracks));
          setLoadedSavedPlaylistId(null);
          setCurrentPlaylistSourceUrl("");
          currentPlaylistNameRef.current = undefined;
          setSavedPlaylistMessage(t("lobby.spotify.clearPlaylistDone"));
        }

        socket.once(ServerToClientEvent.PlaylistTracks, handleClearConfirmed);
        socket.emit(ClientToServerEvent.RemovePlaylistTracks, {
          roomId,
          trackIds: tracks.map((track) => track.id),
        });
      });
    });
  }

  function searchSpotifyPlaylists() {
    if (!roomId || playlistSearchQuery.trim().length < 2) return;

    setPlaylistSearchPhase("searching");
    setPlaylistSearchError(null);
    setGeneratedPlaylistMessage(null);

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifyPlaylistSearchResultPayload) {
        socket.off(ServerToClientEvent.SpotifyPlaylistSearchResult, handleResult);

        if (payload.success) {
          setPlaylistSearchPhase("idle");
          setPlaylistSearchResults(payload.playlists);
          setSelectedSpotifyPlaylistIds(new Set());
          setCandidateError(null);
        } else {
          setPlaylistSearchPhase("error");
          setPlaylistSearchError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyPlaylistSearchResult, handleResult);
      socket.emit(ClientToServerEvent.SearchSpotifyPlaylists, {
        roomId,
        query: playlistSearchQuery.trim(),
        limit: 30,
      });
    });
  }

  function searchSpotifyMusic() {
    searchSpotifyMusicByType(smartSearchType);
  }

  function searchSpotifyMusicByType(type: SpotifySmartSearchTypeFilter) {
    if (!roomId || smartSearchQuery.trim().length < 2) return;

    setSmartSearchType(type);
    setSmartSearchPhase("searching");
    setSmartSearchLoadMorePhase("idle");
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSavedPlaylistMessage(null);
    requestSpotifyMusicSearch(0, "replace", type);
  }

  function loadMoreSpotifyMusic() {
    if (
      !roomId ||
      smartSearchQuery.trim().length < 2 ||
      !smartSearchHasMore ||
      smartSearchLoadMorePhase === "loading"
    ) {
      return;
    }

    setSmartSearchLoadMorePhase("loading");
    setSmartSearchError(null);
    requestSpotifyMusicSearch(smartSearchNextOffset, "append", smartSearchType);
  }

  function requestSpotifyMusicSearch(
    offset: number,
    mode: "replace" | "append",
    type: SpotifySmartSearchTypeFilter,
  ) {
    if (!roomId) return;

    const activeRoomId = roomId;
    const query = smartSearchQuery.trim();

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifySmartSearchResultPayload) {
        socket.off(ServerToClientEvent.SpotifySmartSearchResult, handleResult);

        if (payload.success) {
          setSmartSearchPhase("idle");
          setSmartSearchLoadMorePhase("idle");
          setSmartSearchHasSearched(true);
          setSmartSearchHasMore(payload.hasMore);
          setSmartSearchNextOffset(payload.nextOffset ?? payload.offset + payload.limit);
          setSmartSearchResults((current) =>
            mode === "append"
              ? appendUniqueSmartSearchResults(current, payload.results)
              : payload.results,
          );
        } else {
          setSmartSearchPhase("error");
          setSmartSearchLoadMorePhase("idle");
          setSmartSearchError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifySmartSearchResult, handleResult);
      socket.emit(ClientToServerEvent.SearchSpotifyMusic, {
        roomId: activeRoomId,
        query,
        limit: 20,
        offset,
        types: [type],
      });
    });
  }

  function addSmartSearchTrackToQueue(result: SpotifySmartSearchResult) {
    addSmartSearchTracksToQueue([result]);
  }

  function addSmartSearchTracksToQueue(results: SpotifySmartSearchResult[]) {
    if (!roomId) return;

    const tracks = results
      .filter((result) => !smartSearchQueuedTrackIds.has(result.id))
      .flatMap(mapSmartSearchResultToTrack);
    if (tracks.length === 0) return;

    void getSocketClient().then((socket) => {
      function handleLoadConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getSmartSearchIdsFromPlaylistTracks(payload.tracks));
        setSavedPlaylistMessage(
          tracks.length === 1
            ? t("lobby.spotify.builder.trackAdded")
            : t("lobby.spotify.builder.playlistTracksAdded", { count: tracks.length }),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
      socket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
        roomId,
        mode: "append",
        tracks,
      });
    });
  }

  function removeOpenedPlaylistTracksFromQueue(trackIds: ReadonlySet<string>) {
    if (!roomId || trackIds.size === 0) return;

    void getSocketClient().then((socket) => {
      function handleRemoveConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getSmartSearchIdsFromPlaylistTracks(payload.tracks));
        setSavedPlaylistMessage(
          t("lobby.spotify.builder.playlistTracksRemoved", { count: trackIds.size }),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
      socket.emit(ClientToServerEvent.RemovePlaylistTracks, {
        roomId,
        trackIds: Array.from(trackIds),
      });
    });
  }

  function removeSmartSearchTracksFromQueue(results: SpotifySmartSearchResult[]) {
    if (!roomId) return;

    const trackIds = results
      .map((result) => getSmartSearchQueueTrackId(result))
      .filter((trackId) => trackId !== null);
    if (trackIds.length === 0) return;

    void getSocketClient().then((socket) => {
      function handleRemoveConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
        setSmartSearchQueuedTrackIds(getSmartSearchIdsFromPlaylistTracks(payload.tracks));
        setSavedPlaylistMessage(
          t("lobby.spotify.builder.playlistTracksRemoved", { count: trackIds.length }),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
      socket.emit(ClientToServerEvent.RemovePlaylistTracks, {
        roomId,
        trackIds,
      });
    });
  }

  function openSmartSearchPlaylist(result: SpotifySmartSearchResult) {
    if (!roomId || result.type === "track") return;

    setOpenedPlaylistPhase("loading");
    setOpenedPlaylistError(null);

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifyPlaylistDetailPayload) {
        socket.off(ServerToClientEvent.SpotifyPlaylistDetail, handleResult);

        if (payload.success) {
          setOpenedPlaylistPhase("ready");
          setOpenedPlaylist({
            id: payload.playlistId,
            title: payload.title,
            subtitle: payload.subtitle,
            ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
            totalFetched: payload.totalFetched,
            filteredCount: payload.filteredCount,
            tracks: payload.tracks,
          });
        } else {
          setOpenedPlaylistPhase("error");
          setOpenedPlaylistError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyPlaylistDetail, handleResult);
      socket.emit(ClientToServerEvent.OpenSpotifyPlaylist, {
        roomId,
        playlistId: result.id,
        sourceType: result.type,
      });
    });
  }

  function closeOpenedPlaylist() {
    setOpenedPlaylistPhase("idle");
    setOpenedPlaylistError(null);
    setOpenedPlaylist(null);
  }

  function removeOpenedPlaylistTrack(trackId: string) {
    setOpenedPlaylist((playlist) =>
      playlist
        ? {
            ...playlist,
            tracks: playlist.tracks.filter((track) => track.id !== trackId),
          }
        : playlist,
    );
  }

  function updateOpenedPlaylistTrack(trackId: string, patch: CandidateTrackUpdatePatch) {
    setOpenedPlaylist((playlist) =>
      playlist
        ? {
            ...playlist,
            tracks: playlist.tracks.map((track) =>
              track.id === trackId
                ? {
                    ...track,
                    ...patch,
                    sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
                    metadataStatus: patch.metadataStatus ?? track.metadataStatus,
                  }
                : track,
            ),
          }
        : playlist,
    );
  }

  function applyOpenedPlaylistTracks(
    mode: PlaylistQueueUpdateMode,
    trackIds?: ReadonlySet<string>,
  ) {
    if (!roomId || !openedPlaylist) return;

    const playlist = openedPlaylist;
    const tracks =
      trackIds && trackIds.size > 0
        ? playlist.tracks.filter((track) => trackIds.has(track.id))
        : playlist.tracks;
    if (tracks.length === 0) return;

    setOpenedPlaylistPhase("applying");
    setOpenedPlaylistError(null);

    void getSocketClient().then((socket) => {
      function handleLoadConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getSmartSearchIdsFromPlaylistTracks(payload.tracks));
        setOpenedPlaylistPhase("ready");
        currentPlaylistNameRef.current = playlist.title;
        setSavedPlaylistMessage(
          t(
            mode === "append"
              ? "lobby.spotify.builder.playlistTracksAdded"
              : "lobby.spotify.builder.playlistTracksReplaced",
            { count: tracks.length },
          ),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
      socket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
        roomId,
        mode,
        tracks,
      });
    });
  }

  function handleSetSmartSearchQuery(query: string) {
    setSmartSearchQuery(query);
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSmartSearchResults([]);
    closeOpenedPlaylist();
  }

  function handleSetSmartSearchType(type: SpotifySmartSearchTypeFilter) {
    setSmartSearchType(type);
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSmartSearchResults([]);
    closeOpenedPlaylist();
  }

  function toggleSpotifyPlaylistSelection(playlistId: string) {
    setSelectedSpotifyPlaylistIds((current) => {
      const next = new Set(current);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  }

  function requestSpotifyCandidateGeneration(source: SpotifyCandidateSource) {
    if (!roomId) return;

    setCandidatePhase("generating");
    setCandidateError(null);
    setGeneratedPlaylistMessage(null);

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifyCandidatesGeneratedPayload) {
        socket.off(ServerToClientEvent.SpotifyCandidatesGenerated, handleResult);

        if (payload.success) {
          setCandidatePhase("ready");
          setCandidateError(null);
          setCandidateSessionId(payload.candidateSessionId);
          setCandidateSourceSummary(payload.sourceSummary);
          setCandidateTracks(payload.tracks);
        } else {
          setCandidatePhase("error");
          setCandidateError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyCandidatesGenerated, handleResult);
      socket.emit(ClientToServerEvent.GenerateSpotifyCandidates, {
        roomId,
        source,
      });
    });
  }

  function generateCandidatesFromSelectedPlaylists() {
    if (selectedSpotifyPlaylistIds.size === 0) return;

    requestSpotifyCandidateGeneration({
      type: "playlists",
      playlistIds: Array.from(selectedSpotifyPlaylistIds),
      targetCount: SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
    });
  }

  function generateCandidatesFromPreset(
    presetId: SpotifyQuickPickPresetId,
    targetCount = SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  ) {
    requestSpotifyCandidateGeneration({
      type: "preset",
      presetId,
      targetCount,
    });
  }

  function discardGeneratedCandidates() {
    setCandidatePhase("idle");
    setCandidateError(null);
    setCandidateSessionId(null);
    setCandidateSourceSummary(null);
    setCandidateTracks([]);
  }

  function removeCandidateTrack(trackId: string) {
    setCandidateTracks((tracks) => tracks.filter((track) => track.id !== trackId));
  }

  function updateCandidateTrack(trackId: string, patch: CandidateTrackUpdatePatch) {
    setCandidateTracks((tracks) =>
      tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              ...patch,
              sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
              metadataStatus: patch.metadataStatus ?? track.metadataStatus,
            }
          : track,
      ),
    );
  }

  function useGeneratedCandidates(mode: PlaylistQueueUpdateMode = "replace") {
    if (!roomId || !candidateSessionId || candidateTracks.length === 0) return;

    setCandidatePhase("applying");
    setCandidateError(null);

    void getSocketClient().then((socket) => {
      function handleApplied(payload: SpotifyCandidatesAppliedPayload) {
        socket.off(ServerToClientEvent.SpotifyCandidatesApplied, handleApplied);

        if (payload.success) {
          const appliedMessage =
            mode === "append"
              ? t("lobby.spotify.builder.playlistTracksAdded", { count: candidateTracks.length })
              : t("lobby.spotify.generatedPlaylistApplied", { count: payload.importedCount });
          setCandidatePhase("idle");
          setCandidateError(null);
          setCandidateSessionId(null);
          setCandidateSourceSummary(null);
          setCandidateTracks([]);
          currentPlaylistNameRef.current = candidateSourceSummary ?? undefined;
          setSavedPlaylistMessage(appliedMessage);
          showGeneratedPlaylistMessage(appliedMessage);
        } else {
          setCandidatePhase("error");
          setCandidateError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyCandidatesApplied, handleApplied);
      socket.emit(ClientToServerEvent.UseSpotifyCandidates, {
        roomId,
        candidateSessionId,
        trackIds: candidateTracks.map((track) => track.id),
        tracks: candidateTracks,
        mode,
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
    clearCurrentPlaylist,
    closeEditModal: () => setIsEditModalOpen(false),
    confirmOverwrite,
    confirmRenamePlaylist,
    confirmSavePlaylist,
    connectSpotify,
    discardGeneratedCandidates,
    importContentHeight,
    importContentRef,
    importError,
    importPhase,
    importPlaylist,
    importPlaylistSearchResult,
    isEditModalOpen,
    isOverwritePromptActive,
    isSavingWithName,
    loadedSavedPlaylistId,
    openEditModal: () => setIsEditModalOpen(true),
    playlistUrl,
    playlistSearchError,
    playlistSearchPhase,
    playlistSearchQuery,
    playlistSearchResults,
    smartSearchError,
    smartSearchHasSearched,
    smartSearchHasMore,
    smartSearchLoadMorePhase,
    smartSearchPhase,
    smartSearchQuery,
    queuedTrackIds,
    smartSearchQueuedTrackIds,
    smartSearchResults,
    smartSearchType,
    openedPlaylist,
    openedPlaylistError,
    openedPlaylistPhase,
    renameError,
    renameInputValue,
    renamingPlaylistId,
    saveNameError,
    saveName,
    savedPlaylistMessage,
    generatedPlaylistMessage,
    savedPlaylists,
    selectedSavedPlaylistId,
    selectedSpotifyPlaylistIds,
    candidateError,
    candidatePhase,
    candidateSessionId,
    candidateSourceSummary,
    candidateTracks,
    deleteSelectedSavedPlaylist,
    generateCandidatesFromSelectedPlaylists,
    generateCandidatesFromPreset,
    removeCandidateTrack,
    closeOpenedPlaylist,
    saveCurrentPlaylist,
    addSmartSearchTrackToQueue,
    addSmartSearchTracksToQueue,
    applyOpenedPlaylistTracks,
    openSmartSearchPlaylist,
    removeOpenedPlaylistTrack,
    removeOpenedPlaylistTracksFromQueue,
    removeSmartSearchTracksFromQueue,
    loadMoreSpotifyMusic,
    searchSpotifyMusic,
    searchSpotifyMusicByType,
    searchSpotifyPlaylists,
    setPlaylistSearchQuery,
    setSmartSearchQuery: handleSetSmartSearchQuery,
    setSmartSearchType: handleSetSmartSearchType,
    setRenameInputValue: handleSetRenameInputValue,
    setSaveName: handleSetSaveName,
    setSelectedSavedPlaylistId: handleSelectSavedPlaylist,
    setPlaylistUrl,
    startRenamePlaylist,
    switchToSaveAsNew,
    toggleSpotifyPlaylistSelection,
    updateCandidateTrack,
    updateOpenedPlaylistTrack,
    useGeneratedCandidates,
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

function appendUniqueSmartSearchResults(
  current: SpotifySmartSearchResult[],
  incoming: SpotifySmartSearchResult[],
): SpotifySmartSearchResult[] {
  const seenIds = new Set(current.map((result) => `${result.type}:${result.id}`));
  const nextResults = [...current];

  incoming.forEach((result) => {
    const key = `${result.type}:${result.id}`;
    if (seenIds.has(key)) return;
    seenIds.add(key);
    nextResults.push(result);
  });

  return nextResults;
}

function mapSmartSearchResultToTrack(result: SpotifySmartSearchResult): PublicTrackInfo[] {
  if (result.type !== "track" || !result.spotifyUri) return [];

  const releaseYear = result.releaseYear ?? new Date().getFullYear();
  return [
    {
      id: getSmartSearchQueueTrackId(result) ?? `spotify-search-${result.id}`,
      title: result.title,
      artist: result.artist ?? result.subtitle,
      albumTitle: result.albumTitle ?? result.title,
      releaseYear,
      sourceReleaseYear: releaseYear,
      metadataStatus: "imported",
      spotifyTrackUri: result.spotifyUri,
      ...(result.imageUrl ? { artworkUrl: result.imageUrl } : {}),
      ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
    },
  ];
}

function getSmartSearchQueueTrackId(result: SpotifySmartSearchResult): string | null {
  if (result.type !== "track") return null;
  return `spotify-search-${result.id}`;
}

function getSmartSearchIdsFromPlaylistTracks(tracks: PublicTrackInfo[]): Set<string> {
  const ids = new Set<string>();
  tracks.forEach((track) => {
    if (!track.id.startsWith("spotify-search-")) return;
    ids.add(track.id.slice("spotify-search-".length));
  });
  return ids;
}

function getQueuedTrackIdsFromPlaylistTracks(tracks: PublicTrackInfo[]): Set<string> {
  return new Set(tracks.map((track) => track.id));
}
