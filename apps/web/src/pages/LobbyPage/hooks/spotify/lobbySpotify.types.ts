import type {
  PlaylistQueueUpdateMode,
  PublicTrackInfo,
  SpotifyAccountType,
  SpotifyPlaylistSearchItem,
  SpotifyQuickPickPresetId,
  SpotifySmartSearchResult,
  SpotifySmartSearchTypeFilter,
} from "@tunetrack/shared";
import type { SavedPlaylist } from "../../../../services/savedPlaylists/savedPlaylists";

export type AuthPhase = "idle" | "connecting" | "error";
export type ImportPhase = "idle" | "importing" | "error";
export type PlaylistSearchPhase = "idle" | "searching" | "error";
export type SmartSearchPhase = "idle" | "searching" | "error";
export type SmartSearchLoadMorePhase = "idle" | "loading";
export type OpenedPlaylistPhase = "idle" | "loading" | "ready" | "applying" | "error";
export type CandidatePhase = "idle" | "generating" | "ready" | "applying" | "error";

export interface OpenedSpotifyPlaylist {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  totalFetched: number;
  filteredCount: number;
  tracks: PublicTrackInfo[];
}

export interface CandidateTrackUpdatePatch {
  title?: string;
  artist?: string;
  albumTitle?: string;
  releaseYear?: number;
  metadataStatus?: PublicTrackInfo["metadataStatus"];
}

export interface LobbySpotifyAuthState {
  accountType: SpotifyAccountType | null;
  authError: string | null;
  authPhase: AuthPhase;
  cancelConnectSpotify: () => void;
  connectSpotify: () => void;
}

export interface LobbySpotifyImportState {
  clearCurrentPlaylist: () => void;
  importContentHeight: number;
  importContentRef: React.RefObject<HTMLDivElement>;
  importError: string | null;
  importPhase: ImportPhase;
  importPlaylist: () => void;
  importPlaylistSearchResult: (playlist: SpotifyPlaylistSearchItem) => void;
  playlistUrl: string;
  setPlaylistUrl: (url: string) => void;
}

export interface LobbySpotifyPlaylistSearchState {
  playlistSearchError: string | null;
  playlistSearchPhase: PlaylistSearchPhase;
  playlistSearchQuery: string;
  playlistSearchResults: SpotifyPlaylistSearchItem[];
  searchSpotifyPlaylists: () => void;
  setPlaylistSearchQuery: (query: string) => void;
}

export interface LobbySpotifySmartSearchState {
  addSmartSearchTrackToQueue: (result: SpotifySmartSearchResult) => void;
  addSmartSearchTracksToQueue: (results: SpotifySmartSearchResult[]) => void;
  loadMoreSpotifyMusic: () => void;
  removeSmartSearchTracksFromQueue: (results: SpotifySmartSearchResult[]) => void;
  searchSpotifyMusic: () => void;
  searchSpotifyMusicByType: (type: SpotifySmartSearchTypeFilter) => void;
  setSmartSearchQuery: (query: string) => void;
  setSmartSearchType: (type: SpotifySmartSearchTypeFilter) => void;
  smartSearchError: string | null;
  smartSearchHasMore: boolean;
  smartSearchHasSearched: boolean;
  smartSearchLoadMorePhase: SmartSearchLoadMorePhase;
  smartSearchPhase: SmartSearchPhase;
  smartSearchQuery: string;
  smartSearchQueuedTrackIds: ReadonlySet<string>;
  smartSearchResults: SpotifySmartSearchResult[];
  smartSearchType: SpotifySmartSearchTypeFilter;
}

export interface LobbySpotifyOpenedPlaylistState {
  applyOpenedPlaylistTracks: (
    mode: PlaylistQueueUpdateMode,
    trackIds?: ReadonlySet<string>,
  ) => void;
  closeOpenedPlaylist: () => void;
  openSmartSearchPlaylist: (result: SpotifySmartSearchResult) => void;
  openedPlaylist: OpenedSpotifyPlaylist | null;
  openedPlaylistError: string | null;
  openedPlaylistPhase: OpenedPlaylistPhase;
  queuedTrackIds: ReadonlySet<string>;
  removeOpenedPlaylistTrack: (trackId: string) => void;
  removeOpenedPlaylistTracksFromQueue: (trackIds: ReadonlySet<string>) => void;
  updateOpenedPlaylistTrack: (trackId: string, patch: CandidateTrackUpdatePatch) => void;
}

export interface LobbySpotifyCandidatesState {
  candidateError: string | null;
  candidatePhase: CandidatePhase;
  candidateSessionId: string | null;
  candidateSourceSummary: string | null;
  candidateTracks: PublicTrackInfo[];
  discardGeneratedCandidates: () => void;
  generateCandidatesFromPreset: (presetId: SpotifyQuickPickPresetId, targetCount?: number) => void;
  generateCandidatesFromSelectedPlaylists: () => void;
  removeCandidateTrack: (trackId: string) => void;
  selectedSpotifyPlaylistIds: Set<string>;
  toggleSpotifyPlaylistSelection: (playlistId: string) => void;
  updateCandidateTrack: (trackId: string, patch: CandidateTrackUpdatePatch) => void;
  useGeneratedCandidates: (
    mode?: PlaylistQueueUpdateMode,
    trackIds?: string[],
  ) => void;
}

export interface LobbySpotifySavedPlaylistsState {
  cancelRenamePlaylist: () => void;
  cancelSavePlaylist: () => void;
  confirmOverwrite: () => void;
  confirmRenamePlaylist: () => void;
  confirmSavePlaylist: () => void;
  deleteSelectedSavedPlaylist: () => void;
  generatedPlaylistMessage: string | null;
  isOverwritePromptActive: boolean;
  isSavingWithName: boolean;
  loadedSavedPlaylistId: string | null;
  renameError: string | null;
  renameInputValue: string;
  renamingPlaylistId: string | null;
  saveCurrentPlaylist: () => void;
  saveName: string;
  saveNameError: string | null;
  savedPlaylistMessage: string | null;
  savedPlaylists: SavedPlaylist[];
  selectedSavedPlaylistId: string;
  setRenameInputValue: (name: string) => void;
  setSaveName: (name: string) => void;
  setSelectedSavedPlaylistId: (playlistId: string) => void;
  startRenamePlaylist: (playlistId: string) => void;
  switchToSaveAsNew: () => void;
}

export interface LobbySpotifyQueueState {
  closeEditModal: () => void;
  isEditModalOpen: boolean;
  openEditModal: () => void;
}

export interface UseLobbySpotifyResult {
  auth: LobbySpotifyAuthState;
  candidates: LobbySpotifyCandidatesState;
  import: LobbySpotifyImportState;
  openedPlaylist: LobbySpotifyOpenedPlaylistState;
  playlistSearch: LobbySpotifyPlaylistSearchState;
  queue: LobbySpotifyQueueState;
  savedPlaylists: LobbySpotifySavedPlaylistsState;
  smartSearch: LobbySpotifySmartSearchState;
}
