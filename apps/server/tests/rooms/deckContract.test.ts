import { loadCuratedPlaylistPayloadSchema } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import { buildYearDeck } from "../support/decks.js";
import { createTestRoomServices } from "../support/roomServices.js";

const ROOM_ID = "TEST_ROOM_1";
const HOST_SOCKET_ID = "host-socket";
const GUEST_SOCKET_ID = "guest-socket";
const PRACTICE_DECK = buildYearDeck([1970, 1980, 1990, 2000, 2010], "practice-track");

function openLobby() {
  const services = createTestRoomServices({ deck: PRACTICE_DECK });
  services.lobby.createRoom(ROOM_ID, "Player One", HOST_SOCKET_ID, "host-session");
  services.lobby.addPlayerToRoom(ROOM_ID, "Player Two", GUEST_SOCKET_ID, "guest-session");
  return services;
}

function loadCuratedDeck(services: ReturnType<typeof openLobby>) {
  return services.playlists.loadCuratedPlaylist(
    loadCuratedPlaylistPayloadSchema.parse({
      roomId: ROOM_ID,
      tracks: [1981, 1982].map((releaseYear, index) => ({
        id: `curated-track-${index + 1}`,
        title: `Test Song ${index + 1}`,
        artist: "Test Artist",
        albumTitle: "Test Album",
        releaseYear,
        metadataStatus: "imported",
      })),
    }),
    HOST_SOCKET_ID,
  ).roomState;
}

/** Decision 7: Start needs a deck, and the practice deck is only used when the host chooses it. */
describe("room deck contract (04 §4.3)", () => {
  it("opens a room without a deck", () => {
    const services = openLobby();

    expect(services.store.getRoom(ROOM_ID)?.roomState.settings).toMatchObject({
      deckSource: "none",
      playlistImported: false,
      importedTrackCount: 0,
    });
  });

  it("refuses to start without a deck instead of dealing the practice deck", () => {
    const services = openLobby();

    expect(() => services.gameplay.startGame(HOST_SOCKET_ID, { roomId: ROOM_ID })).toThrow(
      "DECK_REQUIRED",
    );
    expect(services.store.getRoom(ROOM_ID)?.roomState.status).toBe("lobby");
  });

  it("loads the practice deck when the host chooses it and deals from it", () => {
    const services = openLobby();

    const lobbyState = services.deck.usePracticeDeck(HOST_SOCKET_ID, ROOM_ID);
    const startedState = services.gameplay.startGame(HOST_SOCKET_ID, { roomId: ROOM_ID });

    expect(lobbyState.settings).toMatchObject({
      deckSource: "practice",
      playlistImported: true,
      importedTrackCount: PRACTICE_DECK.length,
    });
    expect(PRACTICE_DECK.map((card) => card.id)).toContain(startedState.currentTrackCard?.id);
  });

  it("lets only the host choose the practice deck, and only in the lobby", () => {
    const services = openLobby();

    expect(() => services.deck.usePracticeDeck(GUEST_SOCKET_ID, ROOM_ID)).toThrow(
      "ONLY_HOST_CAN_IMPORT_PLAYLIST",
    );
    expect(services.store.getRoom(ROOM_ID)?.roomState.settings.deckSource).toBe("none");

    services.deck.usePracticeDeck(HOST_SOCKET_ID, ROOM_ID);
    services.gameplay.startGame(HOST_SOCKET_ID, { roomId: ROOM_ID });

    expect(() => services.deck.usePracticeDeck(HOST_SOCKET_ID, ROOM_ID)).toThrow(
      "GAME_ALREADY_STARTED",
    );
  });

  it("marks a Spotify deck as Spotify, also when it replaces the practice deck", () => {
    const services = openLobby();
    services.deck.usePracticeDeck(HOST_SOCKET_ID, ROOM_ID);

    expect(loadCuratedDeck(services).settings).toMatchObject({
      deckSource: "spotify",
      importedTrackCount: 2,
    });
  });

  it("keeps the practice source when the host corrects a practice song's year", () => {
    const services = openLobby();
    services.deck.usePracticeDeck(HOST_SOCKET_ID, ROOM_ID);

    const { roomState } = services.deck.updateImportedDeckTrack(HOST_SOCKET_ID, {
      roomId: ROOM_ID,
      trackId: "practice-track-1",
      releaseYear: 1971,
    });

    expect(roomState.settings.deckSource).toBe("practice");
  });

  it("returns to no deck, and blocks Start again, when the host removes every song", () => {
    const services = openLobby();
    services.deck.usePracticeDeck(HOST_SOCKET_ID, ROOM_ID);

    const roomState = services.deck.removeTracksFromImportedDeck(
      HOST_SOCKET_ID,
      ROOM_ID,
      PRACTICE_DECK.map((card) => card.id),
    );

    expect(roomState.settings).toMatchObject({ deckSource: "none", playlistImported: false });
    expect(() => services.gameplay.startGame(HOST_SOCKET_ID, { roomId: ROOM_ID })).toThrow(
      "DECK_REQUIRED",
    );
  });
});
