import type { GameTrackCard } from "@tunetrack/game-engine";
import { describe, expect, it } from "vitest";
import { createTestRoomCore } from "../support/roomCore.js";

const ROOM_ID = "TEST_ROOM_1";
const HOST_SOCKET_ID = "host-socket";

function openLobby(roomId = ROOM_ID) {
  const core = createTestRoomCore();
  core.lobby.createRoom(roomId, "Player One", HOST_SOCKET_ID, "host-session");
  return core;
}

function joinAs(
  core: ReturnType<typeof openLobby>,
  displayName: string,
  index: number,
  roomId = ROOM_ID,
) {
  return core.lobby.addPlayerToRoom(roomId, displayName, `guest-socket-${index}`, `guest-${index}`);
}

function displayNames(core: ReturnType<typeof openLobby>) {
  return core.store.getRoom(ROOM_ID)?.roomState.players.map((player) => player.displayName);
}

describe("duplicate display names (04 §6.1, decision 11)", () => {
  it("suffixes a joining name already in the room, in any case and spacing, with the lowest free number", () => {
    const core = openLobby();

    joinAs(core, "player one", 1);
    joinAs(core, "  Player One ", 2);
    joinAs(core, "Player Two", 3);

    expect(displayNames(core)).toEqual([
      "Player One",
      "player one 2",
      "Player One 3",
      "Player Two",
    ]);
  });

  it("keeps a suffixed name within the name length limit", () => {
    const core = openLobby();
    const longName = "Player With A Long Name1";
    joinAs(core, longName, 1);

    joinAs(core, longName, 2);

    expect(displayNames(core)?.[2]).toBe("Player With A Long Nam 2");
  });

  it("suffixes a rename to another player's name but not a re-cased own name", () => {
    const core = openLobby();
    joinAs(core, "Player Two", 1);

    core.lobby.updatePlayerProfile("guest-socket-1", {
      displayName: "PLAYER ONE",
      roomId: ROOM_ID,
    });
    expect(displayNames(core)).toEqual(["Player One", "PLAYER ONE 2"]);

    core.lobby.updatePlayerProfile(HOST_SOCKET_ID, { displayName: "player one", roomId: ROOM_ID });
    expect(displayNames(core)).toEqual(["player one", "PLAYER ONE 2"]);
  });
});

describe("room codes in any case (04 §6.2)", () => {
  it("joins and previews a room by its code typed in another case, under the stored code", () => {
    const core = openLobby();

    const { roomState } = joinAs(core, "Player Two", 1, "test_room_1");

    expect(roomState.roomId).toBe(ROOM_ID);
    expect(roomState.players).toHaveLength(2);
    expect(core.store.getLobbySummary("Test_Room_1")?.roomId).toBe(ROOM_ID);
  });

  it("refuses to create a room whose code differs from an existing one only by case", () => {
    const core = openLobby();

    expect(() =>
      core.lobby.createRoom("test_room_1", "Player Two", "guest-socket-1", "guest-1"),
    ).toThrow("ROOM_ALREADY_EXISTS");
  });

  it("refuses a rename to another room's code in another case, and allows re-casing its own", () => {
    const core = openLobby();
    core.lobby.createRoom("TEST_ROOM_2", "Player Two", "other-host-socket", "other-host");

    expect(() =>
      core.lobby.renameRoom(HOST_SOCKET_ID, { roomId: ROOM_ID, nextRoomId: "test_room_2" }),
    ).toThrow("ROOM_ALREADY_EXISTS");

    const { roomState } = core.lobby.renameRoom(HOST_SOCKET_ID, {
      roomId: ROOM_ID,
      nextRoomId: "test_room_1",
    });
    expect(roomState.roomId).toBe("test_room_1");
  });
});

describe("songs whose year needs a check", () => {
  function card(id: string, albumTitle: string): GameTrackCard {
    return {
      id,
      title: `Test Song ${id}`,
      artist: "Test Artist",
      albumTitle,
      releaseYear: 1990,
      metadataStatus: "imported",
    };
  }

  it("counts flagged songs in the room deck and keeps the count current through edits and removals", () => {
    const core = openLobby();

    const imported = core.deck.setImportedDeck(HOST_SOCKET_ID, ROOM_ID, [
      card("track-1", "Test Album (Remastered)"),
      card("track-2", "Greatest Hits"),
      card("track-3", "Test Album"),
    ]);
    expect(imported.settings.tracksToCheckCount).toBe(2);

    const { roomState: afterCheck } = core.deck.updateImportedDeckTrack(HOST_SOCKET_ID, {
      roomId: ROOM_ID,
      trackId: "track-1",
      metadataStatus: "verified",
    });
    expect(afterCheck.settings.tracksToCheckCount).toBe(1);

    const afterRemoval = core.deck.removeTracksFromImportedDeck(HOST_SOCKET_ID, ROOM_ID, [
      "track-2",
    ]);
    expect(afterRemoval.settings.tracksToCheckCount).toBe(0);
  });
});
