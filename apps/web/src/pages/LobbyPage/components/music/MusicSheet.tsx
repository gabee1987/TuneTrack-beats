import type { PublicRoomSettings } from "@tunetrack/shared/client";
import { lazy, Suspense, useEffect, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import {
  MotionSwap,
  createTabSwapMotion,
  useReducedMotionPreference,
} from "../../../../features/motion";
import { ConnectionStatus } from "../../../../features/rooms/ConnectionStatus";
import { SegmentedControl, SelectionActionBar, Sheet } from "../../../../features/ui/primitives";
import { useConnectionStatus } from "../../../../services/socket/connectionState";
import type { LobbySetupModel } from "../../hooks/lobbySetupModel";
import {
  getDefaultMusicTab,
  getMusicPlaybackState,
  summarizeSavedDeck,
  type MusicTab,
  type SavedDeckSummary,
} from "../../hooks/music/musicSetupSelectors";
import { useMusicDeckEditor } from "../../hooks/music/useMusicDeckEditor";
import { useMusicFind } from "../../hooks/music/useMusicFind";
import { usePlaylistView } from "../../hooks/music/usePlaylistView";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";
import type { PracticeDeckChoiceStatus } from "../../hooks/spotify/usePracticeDeckChoice";
import { MusicDecksTab } from "./MusicDecksTab";
import { MusicDeckConfirmations, type DeckConfirmation } from "./MusicDeckConfirmations";
import { MusicFindTab } from "./MusicFindTab";
import { getAddRemoveActions } from "./addRemoveActions";
import { MusicPicksTab } from "./MusicPicksTab";
import { MusicPlaybackBlock } from "./MusicPlaybackBlock";
import { SaveDeckDialog } from "./SaveDeckDialog";
import { SavedDeckDialogs } from "./SavedDeckDialogs";
import styles from "./music.module.css";

// Opened on demand: the list and its virtualiser stay out of the lobby chunk (05 D4).
async function loadPlaylistView() {
  const module = await import("./PlaylistView");
  return { default: module.PlaylistView };
}

const PlaylistView = lazy(loadPlaylistView);

// A song of the room deck opens on its own, without the list (owner, 2026-10-16).
const PlaylistTrackDetailsSheet = lazy(async () => {
  const module = await import("../PlaylistTrackDetailsSheet");
  return { default: module.PlaylistTrackDetailsSheet };
});

interface MusicSheetProps {
  currentSettings: PublicRoomSettings;
  isOpen: boolean;
  onClose: () => void;
  onUsePracticeDeck: () => void;
  practiceDeckStatus: PracticeDeckChoiceStatus;
  setup: LobbySetupModel;
  spotify: UseLobbySpotifyResult;
}

/**
 * Music setup (`22` §4.8): where the songs play, then Your decks or Find. Nothing waits for a
 * Spotify login; offline, the sheet says so and holds every action. A list opens over it in
 * the one Playlist view.
 */
export function MusicSheet({
  currentSettings,
  isOpen,
  onClose,
  onUsePracticeDeck,
  practiceDeckStatus,
  setup,
  spotify,
}: MusicSheetProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const isOffline = useConnectionStatus() !== "connected";
  const find = useMusicFind(spotify);
  const { savedPlaylists } = spotify;
  const savedDecks = savedPlaylists.savedPlaylists.map(summarizeSavedDeck);
  const [tab, setTab] = useState<MusicTab>(() => getDefaultMusicTab(savedDecks.length));
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [deckOptions, setDeckOptions] = useState<SavedDeckSummary | null>(null);
  const [confirmation, setConfirmation] = useState<DeckConfirmation | null>(null);
  const deckEditor = useMusicDeckEditor(currentSettings, isOpen);
  const [roomSongId, setRoomSongId] = useState<string | null>(null);
  const [hasOpenedSong, setHasOpenedSong] = useState(false);
  const roomSong = deckEditor.roomDeck.tracks.find((track) => track.id === roomSongId) ?? null;
  const hasDeck = currentSettings.deckSource !== "none";
  const playlistView = usePlaylistView(spotify, {
    onUse: (use) => {
      if (hasDeck) setConfirmation({ kind: "useList", use });
      else use.apply("replace");
    },
    onUseSavedDeck: (deckId) => {
      const deck = savedDecks.find((saved) => saved.id === deckId);
      if (deck) chooseSavedDeck(deck);
    },
    roomDeck: deckEditor.roomDeck,
  });
  const [hasOpenedView, setHasOpenedView] = useState(playlistView !== null);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setTab(getDefaultMusicTab(savedDecks.length));
  }
  if (playlistView && !hasOpenedView) setHasOpenedView(true);
  if (roomSongId && !hasOpenedSong) setHasOpenedSong(true);

  useEffect(() => {
    if (isOpen) void loadPlaylistView();
  }, [isOpen]);

  function chooseSavedDeck(deck: SavedDeckSummary) {
    if (hasDeck) setConfirmation({ deck, kind: "useSaved" });
    else loadSavedDeck(deck.id);
  }

  // From its tile or its own view: the view steps back to Your decks with the deck in the game.
  function loadSavedDeck(deckId: string) {
    savedPlaylists.setSelectedSavedPlaylistId(deckId);
    if (spotify.queue.editor) spotify.queue.closeEditor();
  }

  function askForPracticeDeck() {
    if (hasDeck) setConfirmation({ kind: "usePractice" });
    else choosePracticeDeck();
  }

  function choosePracticeDeck() {
    onUsePracticeDeck();
    setTab("decks");
  }

  return (
    <Sheet
      dock={
        tab === "find" ? (
          <SelectionActionBar
            actions={getAddRemoveActions(
              {
                addCount: find.selectedUnqueuedCount,
                onAdd: find.addSelected,
                onRemove: find.removeSelected,
                removeCount: find.selectedQueuedCount,
              },
              t,
            )}
            count={find.selectedIds.size}
          />
        ) : undefined
      }
      eyebrow={t("music.title")}
      isOpen={isOpen}
      onClose={onClose}
      title={t("music.heading")}
    >
      <div className={styles.sheetBody}>
        {isOffline ? (
          <div className={styles.offline}>
            <ConnectionStatus />
          </div>
        ) : null}
        <MusicPlaybackBlock
          auth={spotify.auth}
          disabled={isOffline}
          state={getMusicPlaybackState(currentSettings, spotify.auth)}
        />

        <SegmentedControl<MusicTab>
          aria-label={t("music.title")}
          onChange={setTab}
          options={[
            { label: t("music.tab.decks"), value: "decks" },
            { label: t("music.tab.find"), value: "find" },
            { label: t("music.tab.picks"), value: "picks" },
          ]}
          value={tab}
        />
        <MotionSwap motion={createTabSwapMotion(reduceMotion)} swapKey={tab}>
          {tab === "decks" ? (
            <MusicDecksTab
              disabled={isOffline}
              onDeckOptions={setDeckOptions}
              onEditDeck={(deck) =>
                spotify.queue.openEditor({ deck: "saved", deckId: deck.id, filter: "all" })
              }
              onEditRoomDeck={(filter) => spotify.queue.openEditor({ deck: "room", filter })}
              onFind={() => setTab("find")}
              onOpenSong={setRoomSongId}
              onRemoveRoomDeck={() => setConfirmation({ kind: "removeAll" })}
              onSaveRoomDeck={savedPlaylists.saveCurrentPlaylist}
              onUseDeck={chooseSavedDeck}
              roomDeck={
                hasDeck
                  ? {
                      coverUrls: deckEditor.roomCovers,
                      isEditable: currentSettings.deckSource === "spotify",
                      songCount: currentSettings.importedTrackCount,
                      songsToCheck: deckEditor.roomSongsToCheck,
                      toCheckCount: setup.tracksToCheckCount,
                    }
                  : null
              }
              savedDecks={savedDecks}
              statusMessage={savedPlaylists.savedPlaylistMessage}
            />
          ) : null}
          {tab === "find" ? (
            <MusicFindTab disabled={isOffline} find={find} spotify={spotify} />
          ) : null}
          {tab === "picks" ? (
            <MusicPicksTab
              candidates={spotify.candidates}
              disabled={isOffline}
              onUsePracticeDeck={askForPracticeDeck}
              practiceDeckStatus={practiceDeckStatus}
              recommendedSongCount={setup.recommendedDeckSize}
            />
          ) : null}
        </MotionSwap>
      </div>

      <SavedDeckDialogs
        deck={deckOptions}
        onDone={() => setDeckOptions(null)}
        savedPlaylists={savedPlaylists}
      />
      <SaveDeckDialog savedPlaylists={savedPlaylists} />
      <MusicDeckConfirmations
        confirmation={confirmation}
        onCancel={() => setConfirmation(null)}
        onConfirm={(confirmed, mode) => {
          setConfirmation(null);
          if (confirmed.kind === "useSaved") loadSavedDeck(confirmed.deck.id);
          if (confirmed.kind === "usePractice") choosePracticeDeck();
          if (confirmed.kind === "removeAll") spotify.import.clearCurrentPlaylist();
          if (confirmed.kind === "useList") confirmed.use.apply(mode);
        }}
        songCount={currentSettings.importedTrackCount}
      />
      {hasOpenedView ? (
        <Suspense fallback={null}>
          <PlaylistView view={playlistView} />
        </Suspense>
      ) : null}
      {hasOpenedSong ? (
        <Suspense fallback={null}>
          <PlaylistTrackDetailsSheet
            onClose={() => setRoomSongId(null)}
            onSave={deckEditor.roomDeck.updateTrack}
            track={roomSong}
          />
        </Suspense>
      ) : null}
    </Sheet>
  );
}
