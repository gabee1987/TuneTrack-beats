import {
  SPOTIFY_QUICK_PICK_PRESET_IDS,
  type PublicRoomSettings,
  type SpotifySmartSearchResult,
} from "@tunetrack/shared/client";
import { useState } from "react";
import { Button } from "../../features/ui/primitives";
import { MusicDecksTab } from "../LobbyPage/components/music/MusicDecksTab";
import { MusicPlaybackBlock } from "../LobbyPage/components/music/MusicPlaybackBlock";
import { MusicSheet } from "../LobbyPage/components/music/MusicSheet";
import { QuickPickArt } from "../LobbyPage/components/music/QuickPickArt";
import { DEFAULT_RULES, selectLobbySetup } from "../LobbyPage/hooks/lobbySetupModel";
import type {
  MusicPlaybackState,
  SavedDeckSummary,
} from "../LobbyPage/hooks/music/musicSetupSelectors";
import type {
  LobbySpotifyAuthState,
  UseLobbySpotifyResult,
} from "../LobbyPage/hooks/spotify/lobbySpotify.types";
import styles from "./DesignSystemPage.module.css";

const noop = () => undefined;

const PLAYBACK_STATES: MusicPlaybackState[] = ["none", "connecting", "error", "premium", "free"];

const AUTH: LobbySpotifyAuthState = {
  accountType: null,
  authError: null,
  authPhase: "idle",
  cancelConnectSpotify: noop,
  connectSpotify: noop,
};

const SAVED_DECKS: SavedDeckSummary[] = [
  { coverUrls: [], id: "TEST_DECK_1", name: "Road Trip", songCount: 48, toCheckCount: 3 },
  { coverUrls: [], id: "TEST_DECK_2", name: "Party Classics", songCount: 120, toCheckCount: 0 },
];

const RESULTS: SpotifySmartSearchResult[] = [
  {
    artist: "Artist One",
    id: "TEST_TRACK_1",
    releaseYear: 1984,
    subtitle: "Artist One",
    title: "Song One",
    type: "track",
  },
  {
    artist: "Artist Two",
    id: "TEST_TRACK_2",
    releaseYear: 1991,
    subtitle: "Artist Two",
    title: "Song Two",
    type: "track",
  },
  { id: "TEST_ALBUM_1", subtitle: "Artist One · 1984", title: "Album One", type: "album" },
];

/** Music setup (`22` §4.8): the Playback states, Your decks, and the whole sheet over demo data. */
export function MusicGallery() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">Music sheet</h2>
      {PLAYBACK_STATES.map((state) => (
        <MusicPlaybackBlock
          auth={{ ...AUTH, authError: state === "error" ? "Spotify login did not finish." : null }}
          disabled={false}
          key={state}
          state={state}
        />
      ))}
      <MusicDecksTab
        disabled={false}
        onDeckOptions={noop}
        onEditRoomDeck={noop}
        onFind={noop}
        onRemoveRoomDeck={noop}
        onSaveRoomDeck={noop}
        onUseDeck={noop}
        roomDeck={{ isEditable: true, songCount: 60, toCheckCount: 4 }}
        savedDecks={SAVED_DECKS}
        statusMessage={null}
      />
      <MusicDecksTab
        disabled={false}
        onDeckOptions={noop}
        onEditRoomDeck={noop}
        onFind={noop}
        onRemoveRoomDeck={noop}
        onSaveRoomDeck={noop}
        onUseDeck={noop}
        roomDeck={null}
        savedDecks={[]}
        statusMessage={null}
      />
      <div className={styles.row}>
        {SPOTIFY_QUICK_PICK_PRESET_IDS.map((presetId) => (
          <QuickPickArt key={presetId} presetId={presetId} />
        ))}
      </div>
      <Button onClick={() => setIsSheetOpen(true)} variant="secondary">
        Open the Music sheet
      </Button>
      <MusicSheet
        currentSettings={DEMO_SETTINGS}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onUsePracticeDeck={noop}
        practiceDeckStatus="idle"
        setup={DEMO_SETUP}
        spotify={DEMO_SPOTIFY}
      />
    </section>
  );
}

const DEMO_SETTINGS: PublicRoomSettings = {
  ...DEFAULT_RULES,
  deckSource: "spotify",
  importedTrackCount: 60,
  playlistImported: true,
  spotifyAccountType: null,
  spotifyAuthStatus: "none",
  spotifyPlaybackGeneration: 0,
  spotifyPlaybackOwnerPlayerId: null,
  tracksToCheckCount: 4,
};

const DEMO_SETUP = selectLobbySetup({
  connectionStatus: "connected",
  currentPlayerId: null,
  roomState: null,
  settings: DEMO_SETTINGS,
  startGameActionStatus: "idle",
});

const DEMO_SPOTIFY = {
  auth: AUTH,
  candidates: {
    candidateError: null,
    candidatePhase: "idle",
    candidateTracks: [],
    discardGeneratedCandidates: noop,
    generateCandidatesFromPreset: noop,
  },
  import: {
    clearCurrentPlaylist: noop,
    importError: null,
    importPhase: "idle",
    importPlaylist: noop,
    setPlaylistUrl: noop,
  },
  openedPlaylist: {
    openSmartSearchPlaylist: noop,
    openedPlaylistPhase: "idle",
    queuedTrackIds: new Set<string>(),
  },
  playlistSearch: {
    playlistSearchError: null,
    playlistSearchPhase: "idle",
    playlistSearchResults: [],
    searchSpotifyPlaylists: noop,
    setPlaylistSearchQuery: noop,
  },
  queue: { closeEditModal: noop, isEditModalOpen: false, openEditModal: noop },
  savedPlaylists: {
    cancelRenamePlaylist: noop,
    cancelSavePlaylist: noop,
    confirmOverwrite: noop,
    confirmRenamePlaylist: noop,
    confirmSavePlaylist: noop,
    deleteSavedPlaylistById: noop,
    isOverwritePromptActive: false,
    isSavingWithName: false,
    loadedSavedPlaylistId: null,
    renameError: null,
    renameInputValue: "",
    renamingPlaylistId: null,
    saveCurrentPlaylist: noop,
    saveName: "",
    saveNameError: null,
    savedPlaylistMessage: null,
    savedPlaylists: [],
    setRenameInputValue: noop,
    setSaveName: noop,
    setSelectedSavedPlaylistId: noop,
    startRenamePlaylist: noop,
    switchToSaveAsNew: noop,
  },
  smartSearch: {
    addSmartSearchTrackToQueue: noop,
    addSmartSearchTracksToQueue: noop,
    loadMoreSpotifyMusic: noop,
    removeSmartSearchTracksFromQueue: noop,
    searchSpotifyMusic: noop,
    searchSpotifyMusicByType: noop,
    setSmartSearchQuery: noop,
    setSmartSearchType: noop,
    smartSearchError: null,
    smartSearchHasMore: true,
    smartSearchHasSearched: true,
    smartSearchLoadMorePhase: "idle",
    smartSearchPhase: "idle",
    smartSearchQueuedTrackIds: new Set(["TEST_TRACK_2"]),
    smartSearchResults: RESULTS,
  },
} as unknown as UseLobbySpotifyResult;
