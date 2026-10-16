import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicRoomSettings, SpotifySmartSearchResult } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MotionFeatureProvider } from "../../../../features/motion";
import type { SavedPlaylist } from "../../../../services/savedPlaylists/savedPlaylists";
import type { ConnectionStatus } from "../../../../services/socket/connectionState";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { buildLobbyRoomState, buildRoomSettings } from "../../../../test/roomStateFixtures";
import { selectLobbySetup } from "../../hooks/lobbySetupModel";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";
import { MusicSheet } from "./MusicSheet";

const connection = vi.hoisted(() => ({ status: "connected" as ConnectionStatus }));

vi.mock("../../../../services/socket/connectionState", () => ({
  useConnectionStatus: () => connection.status,
}));
vi.mock("../../../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));
vi.mock("../../hooks/music/useRoomDeckTracks", () => ({
  useRoomDeckTracks: () => ({
    isLoading: false,
    removeTracks: vi.fn(),
    tracks: [
      {
        albumTitle: "Album Two (Remastered)",
        artist: "Artist Two",
        id: "TEST_TRACK_2",
        metadataStatus: "imported",
        releaseYear: 2011,
        title: "Song Two",
      },
    ],
    updateTrack: vi.fn(),
  }),
}));

const SONG: SpotifySmartSearchResult = {
  artist: "Artist One",
  id: "TEST_TRACK_1",
  releaseYear: 1984,
  subtitle: "Artist One",
  title: "Song One",
  type: "track",
};

const ALBUM: SpotifySmartSearchResult = {
  id: "TEST_ALBUM_1",
  subtitle: "Artist One · 1984",
  title: "Album One",
  type: "album",
};

function buildSavedDeck(name: string): SavedPlaylist {
  return {
    createdAtEpochMs: 1,
    id: `TEST_DECK_${name}`,
    name,
    source: "spotify",
    tracks: [
      {
        albumTitle: "Album One",
        artist: "Artist One",
        id: "TEST_TRACK_1",
        metadataStatus: "imported",
        releaseYear: 1984,
        title: "Song One",
      },
    ],
    updatedAtEpochMs: 1,
  };
}

interface SpotifyStubOptions {
  candidatePhase?: "idle" | "generating";
  candidateTracks?: unknown[];
  results?: SpotifySmartSearchResult[];
  savedDecks?: SavedPlaylist[];
  searchPhase?: "idle" | "searching" | "error";
}

function buildSpotifyStub({
  candidatePhase = "idle",
  candidateTracks = [],
  results = [],
  savedDecks = [],
  searchPhase = "idle",
}: SpotifyStubOptions = {}) {
  return {
    auth: {
      accountType: null,
      authError: null,
      authPhase: "idle",
      cancelConnectSpotify: vi.fn(),
      connectSpotify: vi.fn(),
    },
    candidates: {
      candidateError: null,
      candidatePhase,
      candidateTracks,
      discardGeneratedCandidates: vi.fn(),
      generateCandidatesFromPreset: vi.fn(),
    },
    import: {
      clearCurrentPlaylist: vi.fn(),
      importError: null,
      importPhase: "idle",
      importPlaylist: vi.fn(),
      setPlaylistUrl: vi.fn(),
    },
    openedPlaylist: {
      openSmartSearchPlaylist: vi.fn(),
      openedPlaylistPhase: "idle",
      queuedTrackIds: new Set(),
    },
    playlistSearch: {
      playlistSearchError: null,
      playlistSearchPhase: "idle",
      playlistSearchResults: [],
      searchSpotifyPlaylists: vi.fn(),
      setPlaylistSearchQuery: vi.fn(),
    },
    queue: { closeEditor: vi.fn(), editor: null, openEditor: vi.fn() },
    savedPlaylists: {
      cancelRenamePlaylist: vi.fn(),
      cancelSavePlaylist: vi.fn(),
      isOverwritePromptActive: false,
      isSavingWithName: false,
      loadedSavedPlaylistId: null,
      renamingPlaylistId: null,
      saveCurrentPlaylist: vi.fn(),
      savedPlaylistMessage: null,
      savedPlaylists: savedDecks,
      setSelectedSavedPlaylistId: vi.fn(),
      updateSavedDeckTracks: vi.fn(),
    },
    smartSearch: {
      addSmartSearchTrackToQueue: vi.fn(),
      addSmartSearchTracksToQueue: vi.fn(),
      removeSmartSearchTracksFromQueue: vi.fn(),
      searchSpotifyMusic: vi.fn(),
      searchSpotifyMusicByType: vi.fn(),
      setSmartSearchQuery: vi.fn(),
      setSmartSearchType: vi.fn(),
      smartSearchError: null,
      smartSearchHasMore: false,
      smartSearchHasSearched: results.length > 0,
      smartSearchLoadMorePhase: "idle",
      smartSearchPhase: searchPhase,
      smartSearchQueuedTrackIds: new Set<string>(),
      smartSearchResults: results,
    },
  } as unknown as UseLobbySpotifyResult;
}

interface RenderOptions extends SpotifyStubOptions {
  settings?: Partial<PublicRoomSettings>;
}

function renderSheet({ settings = {}, ...spotifyOptions }: RenderOptions = {}) {
  const spotify = buildSpotifyStub(spotifyOptions);
  const currentSettings = buildRoomSettings(settings);
  const setup = selectLobbySetup({
    connectionStatus: "connected",
    currentPlayerId: null,
    roomState: buildLobbyRoomState({ settings: currentSettings }),
    settings: currentSettings,
    startGameActionStatus: "idle",
  });
  const onUsePracticeDeck = vi.fn();
  // The tabs fade in through `m`, as on the page, so the animation features are loaded.
  renderWithProviders(
    <MotionFeatureProvider>
      <MusicSheet
        currentSettings={currentSettings}
        isOpen
        onClose={vi.fn()}
        onUsePracticeDeck={onUsePracticeDeck}
        practiceDeckStatus="idle"
        setup={setup}
        spotify={spotify}
      />
    </MotionFeatureProvider>,
  );
  return { onUsePracticeDeck, spotify };
}

function sheet() {
  return screen.getByRole("dialog", { name: "Choose the songs" });
}

beforeEach(() => {
  connection.status = "connected";
});

describe("MusicSheet without a Spotify login", () => {
  it("says where songs play, offers the login, and opens on Find with nothing held back", () => {
    renderSheet();

    expect(
      screen.getByText("Songs play on this phone. Connect Spotify to hear them."),
    ).toBeInTheDocument();
    expect(screen.getByText("You log in again for each new room.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Spotify" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Find" })).toBeChecked();
    expect(screen.getByRole("searchbox", { name: "Search Spotify or paste a link" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^80s Hits/ })).not.toBeInTheDocument();
  });

  it("keeps the quick picks and the practice deck in their own tab, ready without a login", async () => {
    renderSheet();

    await userEvent.click(screen.getByRole("radio", { name: "Quick picks" }));

    expect(await screen.findByRole("button", { name: /^80s Hits/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Use the practice deck" })).toBeEnabled();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("imports a pasted playlist link at once", async () => {
    const { spotify } = renderSheet();

    await userEvent.type(
      screen.getByRole("searchbox"),
      "spotify:playlist:TESTPLAYLIST1234567890{Enter}",
    );

    expect(spotify.import.importPlaylist).toHaveBeenCalledTimes(1);
    expect(spotify.smartSearch.searchSpotifyMusic).not.toHaveBeenCalled();
  });

  it("searches songs by default and playlists from their chip", async () => {
    const { spotify } = renderSheet();

    await userEvent.type(screen.getByRole("searchbox"), "eighties{Enter}");
    expect(spotify.smartSearch.searchSpotifyMusic).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Playlists" }));
    expect(spotify.playlistSearch.searchSpotifyPlaylists).toHaveBeenCalledTimes(1);
  });

  it("generates a quick pick with the room's recommended size", async () => {
    const { spotify } = renderSheet();

    await userEvent.click(screen.getByRole("radio", { name: "Quick picks" }));
    await userEvent.click(await screen.findByRole("button", { name: /^80s Hits/ }));

    expect(spotify.candidates.generateCandidatesFromPreset).toHaveBeenCalledWith("80s_hits", 40);
  });

  it("covers the app with the loading screen while a quick pick is built", async () => {
    renderSheet({ candidatePhase: "generating" });

    await userEvent.click(screen.getByRole("radio", { name: "Quick picks" }));

    expect(await screen.findByText("Building your music deck")).toBeInTheDocument();
  });

  it("gives the whole sheet to generated songs, without the playback block", () => {
    renderSheet({ candidateTracks: [{ id: "TEST_TRACK_1" }] });

    expect(screen.queryByRole("button", { name: "Connect Spotify" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Quick picks" })).not.toBeInTheDocument();
  });
});

describe("MusicSheet Find results", () => {
  it("shows three skeleton rows while searching", () => {
    renderSheet({ searchPhase: "searching" });

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("adds a song in place and opens an album", async () => {
    const { spotify } = renderSheet({ results: [SONG, ALBUM] });

    await userEvent.click(screen.getByRole("button", { name: "Add Song One" }));
    expect(spotify.smartSearch.addSmartSearchTrackToQueue).toHaveBeenCalledWith(SONG);

    await userEvent.click(screen.getByRole("button", { name: /^Album One/ }));
    expect(spotify.openedPlaylist.openSmartSearchPlaylist).toHaveBeenCalledWith(ALBUM);
  });

  it("opens a song's read-only details from its row and adds it from there", async () => {
    const { spotify } = renderSheet({ results: [{ ...SONG, albumTitle: "Album One" }] });

    await userEvent.click(screen.getByRole("button", { name: /^Song One/ }));
    const details = screen.getByRole("dialog", { name: "Song details" });
    expect(within(details).getByDisplayValue("Album One")).toHaveAttribute("readonly");
    expect(within(details).getByDisplayValue("1984")).toHaveAttribute("readonly");

    await userEvent.click(within(details).getByRole("button", { name: "Add to deck" }));
    expect(spotify.smartSearch.addSmartSearchTrackToQueue).toHaveBeenCalledWith({
      ...SONG,
      albumTitle: "Album One",
    });
  });

  it("selects a song from its cover and adds it from the one counted button", async () => {
    const { spotify } = renderSheet({ results: [SONG] });

    await userEvent.click(screen.getByRole("button", { name: "Select Song One" }));
    await userEvent.click(screen.getByRole("button", { name: "Add 1" }));

    expect(spotify.smartSearch.addSmartSearchTracksToQueue).toHaveBeenCalledWith([SONG]);
  });
});

describe("MusicSheet Your decks", () => {
  it("opens on Your decks once a deck is saved and asks before replacing the game's songs", async () => {
    const { spotify } = renderSheet({
      savedDecks: [buildSavedDeck("Road Trip")],
      settings: { deckSource: "spotify", importedTrackCount: 30 },
    });

    expect(screen.getByRole("radio", { name: "Your decks" })).toBeChecked();
    expect(
      within(screen.getByRole("region", { name: "In this game" })).getByText("30 songs"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load Road Trip into the game" }));
    const confirm = screen.getByRole("dialog", { name: "Replace the 30 songs in your deck?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Replace" }));

    expect(spotify.savedPlaylists.setSelectedSavedPlaylistId).toHaveBeenCalledWith(
      "TEST_DECK_Road Trip",
    );
  });

  it("edits a saved deck without loading it", async () => {
    const { spotify } = renderSheet({ savedDecks: [buildSavedDeck("Road Trip")] });

    await userEvent.click(screen.getByRole("button", { name: "Edit Road Trip" }));

    expect(spotify.queue.openEditor).toHaveBeenCalledWith({
      deck: "saved",
      deckId: "TEST_DECK_Road Trip",
      filter: "all",
    });
    expect(spotify.savedPlaylists.setSelectedSavedPlaylistId).not.toHaveBeenCalled();
  });

  it("lists the songs to check on the game's deck, opening one alone or the editor on all", async () => {
    const { spotify } = renderSheet({
      settings: { deckSource: "spotify", importedTrackCount: 30, tracksToCheckCount: 2 },
    });
    await userEvent.click(screen.getByRole("radio", { name: "Your decks" }));
    const roomDeck = await screen.findByRole("region", { name: "In this game" });

    expect(within(roomDeck).getByText(/2 songs may have the wrong year/)).toBeInTheDocument();
    await userEvent.click(within(roomDeck).getByRole("button", { name: /^Song Two/ }));
    const songTitle = await screen.findByDisplayValue("Song Two");
    expect(spotify.queue.openEditor).not.toHaveBeenCalled();
    const songEditor = songTitle.closest("form") as HTMLElement;
    await userEvent.click(within(songEditor).getByRole("button", { name: "Back" }));

    await userEvent.click(within(roomDeck).getByRole("button", { name: "Check 2 songs" }));
    expect(spotify.queue.openEditor).toHaveBeenLastCalledWith({
      deck: "room",
      filter: "needsCheck",
    });
    await userEvent.click(within(roomDeck).getByRole("button", { name: "Edit songs" }));
    expect(spotify.queue.openEditor).toHaveBeenLastCalledWith({ deck: "room", filter: "all" });
  });

  it("offers Find from an empty Your decks", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("radio", { name: "Your decks" }));
    expect(await screen.findByText("No saved decks yet.")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Find songs" }));

    expect(screen.getByRole("radio", { name: "Find" })).toBeChecked();
    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
  });

  it("removes every song from the game only after a confirmation", async () => {
    const { spotify } = renderSheet({
      savedDecks: [buildSavedDeck("Road Trip")],
      settings: { deckSource: "spotify", importedTrackCount: 30 },
    });

    await userEvent.click(within(sheet()).getByRole("button", { name: "Remove all songs" }));
    const confirm = screen.getByRole("dialog", { name: "Remove all 30 songs from the game?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Remove all songs" }));

    expect(spotify.import.clearCurrentPlaylist).toHaveBeenCalledTimes(1);
  });

  it("asks before the practice deck replaces a deck", async () => {
    const { onUsePracticeDeck } = renderSheet({
      settings: { deckSource: "spotify", importedTrackCount: 30 },
    });

    await userEvent.click(screen.getByRole("radio", { name: "Quick picks" }));
    await userEvent.click(await screen.findByRole("button", { name: "Use the practice deck" }));
    expect(onUsePracticeDeck).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Replace" }));

    expect(onUsePracticeDeck).toHaveBeenCalledTimes(1);
  });
});

describe("MusicSheet playback and connection", () => {
  it("names Spotify Premium once the room is connected", () => {
    renderSheet({ settings: { spotifyAccountType: "premium", spotifyAuthStatus: "connected" } });

    expect(screen.getByText("Spotify Premium · full songs")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect Spotify" })).not.toBeInTheDocument();
  });

  it("holds every action while offline", async () => {
    connection.status = "reconnecting";
    renderSheet();

    expect(screen.getByRole("button", { name: "Connect Spotify" })).toBeDisabled();
    expect(screen.getByRole("searchbox")).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "Quick picks" }));
    expect(await screen.findByRole("button", { name: /^80s Hits/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Use the practice deck" })).toBeDisabled();
  });
});
