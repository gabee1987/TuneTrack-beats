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
import { useMusicFind } from "../../hooks/music/useMusicFind";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";
import type { PracticeDeckChoiceStatus } from "../../hooks/spotify/usePracticeDeckChoice";
import { MusicDecksTab } from "./MusicDecksTab";
import { MusicDeckConfirmations, type DeckConfirmation } from "./MusicDeckConfirmations";
import { MusicFindTab } from "./MusicFindTab";
import { MusicOpenedViews, hasOpenedView } from "./MusicOpenedViews";
import { MusicPicksTab } from "./MusicPicksTab";
import { MusicPlaybackBlock } from "./MusicPlaybackBlock";
import { SaveDeckDialog } from "./SaveDeckDialog";
import { SavedDeckDialogs } from "./SavedDeckDialogs";
import styles from "./music.module.css";

// Opened on demand from the room deck: the editor stays out of the lobby chunk (05 D4).
async function loadPlaylistEditModal() {
  const module = await import("../PlaylistEditModal");
  return { default: module.PlaylistEditModal };
}

const PlaylistEditModal = lazy(loadPlaylistEditModal);

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
 * Spotify login; offline, the sheet says so and holds every action.
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
  const isEditorOpen = spotify.queue.isEditModalOpen;
  const [hasOpenedEditor, setHasOpenedEditor] = useState(isEditorOpen);
  const hasDeck = currentSettings.deckSource !== "none";

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setTab(getDefaultMusicTab(savedDecks.length));
  }
  if (isEditorOpen && !hasOpenedEditor) setHasOpenedEditor(true);

  useEffect(() => {
    if (currentSettings.playlistImported) void loadPlaylistEditModal();
  }, [currentSettings.playlistImported]);

  function chooseSavedDeck(deck: SavedDeckSummary) {
    if (hasDeck) setConfirmation({ deck, kind: "useSaved" });
    else savedPlaylists.setSelectedSavedPlaylistId(deck.id);
  }

  function askForPracticeDeck() {
    if (hasDeck) setConfirmation({ kind: "usePractice" });
    else choosePracticeDeck();
  }

  function choosePracticeDeck() {
    onUsePracticeDeck();
    setTab("decks");
  }

  const showsOpenedView = hasOpenedView(spotify);

  return (
    <Sheet
      dock={
        tab === "find" && find.isSelecting && !showsOpenedView ? (
          <SelectionActionBar
            count={find.selectedIds.size}
            destructiveAction={
              find.selectedQueuedCount > 0
                ? { label: t("music.find.removeFromDeck"), onClick: find.removeSelected }
                : undefined
            }
            primaryAction={{
              disabled: find.selectedUnqueuedCount === 0,
              label: t("music.find.addToDeck"),
              onClick: find.addSelected,
            }}
          />
        ) : undefined
      }
      isOpen={isOpen}
      onClose={onClose}
      title={t("music.title")}
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

        {showsOpenedView ? (
          <MusicOpenedViews
            currentQueueCount={currentSettings.importedTrackCount}
            spotify={spotify}
          />
        ) : (
          <>
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
                  onEditRoomDeck={spotify.queue.openEditModal}
                  onFind={() => setTab("find")}
                  onRemoveRoomDeck={() => setConfirmation({ kind: "removeAll" })}
                  onSaveRoomDeck={savedPlaylists.saveCurrentPlaylist}
                  onUseDeck={chooseSavedDeck}
                  roomDeck={
                    hasDeck
                      ? {
                          isEditable: currentSettings.deckSource === "spotify",
                          songCount: currentSettings.importedTrackCount,
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
          </>
        )}
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
        onConfirm={(confirmed) => {
          setConfirmation(null);
          if (confirmed.kind === "useSaved")
            savedPlaylists.setSelectedSavedPlaylistId(confirmed.deck.id);
          if (confirmed.kind === "usePractice") choosePracticeDeck();
          if (confirmed.kind === "removeAll") spotify.import.clearCurrentPlaylist();
        }}
        songCount={currentSettings.importedTrackCount}
      />
      {hasOpenedEditor ? (
        <Suspense fallback={null}>
          <PlaylistEditModal isOpen={isEditorOpen} onClose={spotify.queue.closeEditModal} />
        </Suspense>
      ) : null}
    </Sheet>
  );
}
