import {
  SPOTIFY_QUICK_PICK_PRESET_IDS,
  type PublicRoomSettings,
  type PublicTrackInfo,
  type SpotifySmartSearchResult,
} from "@tunetrack/shared/client";
import { useMemo, useState } from "react";
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
import type { PlaylistEditorTarget } from "../LobbyPage/hooks/music/playlistEditorTarget";
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

const SONGS_TO_CHECK: PublicTrackInfo[] = [
  {
    albumTitle: "Album One (Remastered)",
    artist: "Artist One",
    id: "TEST_TRACK_1",
    metadataStatus: "imported",
    releaseYear: 2011,
    title: "Song One",
  },
  {
    albumTitle: "Greatest Hits",
    artist: "Artist Two",
    id: "TEST_TRACK_2",
    metadataStatus: "imported",
    releaseYear: 2004,
    title: "Song Two",
  },
];

const EDITOR_DECK_ID = "TEST_DECK_EDITOR";

/** A saved deck the gallery's song editor works on, long enough to scroll. */
const EDITOR_TRACKS: PublicTrackInfo[] = Array.from({ length: 24 }, (_, index) => ({
  albumTitle: index % 4 === 0 ? `Album ${index + 1} (Remastered)` : `Album ${index + 1}`,
  artist: `Artist ${(index % 6) + 1}`,
  id: `TEST_EDITOR_TRACK_${index + 1}`,
  metadataStatus: index % 5 === 0 ? "verified" : "imported",
  releaseYear: 1965 + ((index * 7) % 58),
  sourceReleaseYear: 1965 + ((index * 7) % 58),
  title: `Song ${index + 1}`,
}));

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

/**
 * Music setup (`22` §4.8): the Playback states, Your decks, and the whole sheet over demo data,
 * with each kind of list open in the one Playlist view (§4.9).
 */
export function MusicGallery() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editor, setEditor] = useState<PlaylistEditorTarget | null>(null);
  const [editorTracks, setEditorTracks] = useState(EDITOR_TRACKS);
  const [isQuickPickShown, setIsQuickPickShown] = useState(false);
  const [isPlaylistShown, setIsPlaylistShown] = useState(false);
  const spotify = useMemo(
    () =>
      ({
        ...DEMO_SPOTIFY,
        candidates: {
          ...DEMO_SPOTIFY.candidates,
          applyGeneratedCandidates: noop,
          candidateTracks: isQuickPickShown ? EDITOR_TRACKS : [],
          discardGeneratedCandidates: () => setIsQuickPickShown(false),
          removeCandidateTrack: noop,
          updateCandidateTrack: noop,
        },
        openedPlaylist: {
          ...DEMO_SPOTIFY.openedPlaylist,
          applyOpenedPlaylistTracks: noop,
          closeOpenedPlaylist: () => setIsPlaylistShown(false),
          openedPlaylist: isPlaylistShown ? DEMO_PLAYLIST : null,
          openedPlaylistPhase: isPlaylistShown ? "ready" : "idle",
          removeOpenedPlaylistTrack: noop,
          removeOpenedPlaylistTracksFromQueue: noop,
          updateOpenedPlaylistTrack: noop,
        },
        queue: { closeEditor: () => setEditor(null), editor, openEditor: setEditor },
        savedPlaylists: {
          ...DEMO_SPOTIFY.savedPlaylists,
          savedPlaylists: [
            {
              createdAtEpochMs: 1,
              id: EDITOR_DECK_ID,
              name: "Road Trip",
              source: "spotify",
              tracks: editorTracks,
              updatedAtEpochMs: 1,
            },
          ],
          updateSavedDeckTracks: (_id: string, tracks: PublicTrackInfo[]) =>
            setEditorTracks(tracks),
        },
      }) as UseLobbySpotifyResult,
    [editor, editorTracks, isPlaylistShown, isQuickPickShown],
  );

  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">Music sheet</h2>
      {PLAYBACK_STATES.map((state) => (
        <MusicPlaybackBlock
          auth={{
            ...AUTH,
            authError: state === "error" ? "Spotify login did not finish." : null,
          }}
          disabled={false}
          key={state}
          state={state}
        />
      ))}
      <MusicDecksTab
        disabled={false}
        onDeckOptions={noop}
        onEditDeck={noop}
        onEditRoomDeck={noop}
        onFind={noop}
        onOpenSong={noop}
        onRemoveRoomDeck={noop}
        onSaveRoomDeck={noop}
        onUseDeck={noop}
        roomDeck={{
          coverUrls: [],
          isEditable: true,
          songCount: 60,
          songsToCheck: SONGS_TO_CHECK,
          toCheckCount: 4,
        }}
        savedDecks={SAVED_DECKS}
        statusMessage={null}
      />
      <MusicDecksTab
        disabled={false}
        onDeckOptions={noop}
        onEditDeck={noop}
        onEditRoomDeck={noop}
        onFind={noop}
        onOpenSong={noop}
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
      <div className={styles.row}>
        <Button onClick={() => setIsSheetOpen(true)} variant="secondary">
          Open the Music sheet
        </Button>
        <Button
          onClick={() => {
            setIsSheetOpen(true);
            setEditor({ deck: "saved", deckId: EDITOR_DECK_ID, filter: "all" });
          }}
          variant="secondary"
        >
          Open a saved deck
        </Button>
        <Button
          onClick={() => {
            setIsSheetOpen(true);
            setIsPlaylistShown(true);
          }}
          variant="secondary"
        >
          Open a Spotify playlist
        </Button>
        <Button
          onClick={() => {
            setIsSheetOpen(true);
            setIsQuickPickShown(true);
          }}
          variant="secondary"
        >
          Open a quick-pick result
        </Button>
      </div>
      <MusicSheet
        currentSettings={DEMO_SETTINGS}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onUsePracticeDeck={noop}
        practiceDeckStatus="idle"
        setup={DEMO_SETUP}
        spotify={spotify}
      />
    </section>
  );
}

const DEMO_PLAYLIST = {
  filteredCount: 2,
  id: "TEST_PLAYLIST_1",
  subtitle: "Test Owner",
  title: "Test Playlist",
  totalFetched: 14,
  tracks: EDITOR_TRACKS.slice(0, 12),
};

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
  queue: { closeEditor: noop, editor: null, openEditor: noop },
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
    updateSavedDeckTracks: noop,
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
