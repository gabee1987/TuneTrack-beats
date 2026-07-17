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
