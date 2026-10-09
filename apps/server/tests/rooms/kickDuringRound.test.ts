import { updateRoomSettingsPayloadSchema } from "@tunetrack/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomRegistry } from "../../src/rooms/RoomRegistry.js";
import { buildYearDeck } from "../support/decks.js";

const TEST_ROOM_ID = "TEST_ROOM_1";
const CHALLENGE_WINDOW_SECONDS = 10;

afterEach(() => {
  vi.useRealTimers();
});

/** Host, Player Two and Player Three; Player Two holds the turn and Player Three has 1 TT. */
function startGameWithGuestOnTurn(options: { isChallengeEnabled: boolean }) {
  const roomRegistry = new RoomRegistry();
  roomRegistry.createRoom(TEST_ROOM_ID, "Player One", "host-socket", "host-session");
  const placer = roomRegistry.addPlayerToRoom(
    TEST_ROOM_ID,
    "Player Two",
    "placer-socket",
    "placer-session",
  );
  const challenger = roomRegistry.addPlayerToRoom(
    TEST_ROOM_ID,
    "Player Three",
    "challenger-socket",
    "challenger-session",
  );
  roomRegistry.updateRoomSettings(
    "host-socket",
    TEST_ROOM_ID,
    updateRoomSettingsPayloadSchema.parse({
      roomId: TEST_ROOM_ID,
      ttModeEnabled: options.isChallengeEnabled,
      challengeWindowDurationSeconds: CHALLENGE_WINDOW_SECONDS,
    }),
  );
  roomRegistry.updatePlayerSettings("host-socket", {
    roomId: TEST_ROOM_ID,
    playerId: challenger.playerId,
    startingTimelineCardCount: 1,
    startingTtTokenCount: 1,
  });
  roomRegistry.startGame(
    "host-socket",
    { roomId: TEST_ROOM_ID },
    buildYearDeck([1980, 1990, 2000, 2010, 2020, 2030, 2040], "kick-track"),
  );
  roomRegistry.skipTurn("host-socket", { roomId: TEST_ROOM_ID });

  return { roomRegistry, placerId: placer.playerId, challengerId: challenger.playerId };
}

describe("kicking a player in the middle of a round", () => {
  it("survives the challenge deadline after the placing player is kicked from an open challenge", () => {
    vi.useFakeTimers();
    const { roomRegistry, placerId, challengerId } = startGameWithGuestOnTurn({
      isChallengeEnabled: true,
    });
    roomRegistry.placeCard("placer-socket", { roomId: TEST_ROOM_ID, selectedSlotIndex: 1 });

    roomRegistry.kickPlayer("host-socket", { roomId: TEST_ROOM_ID, playerId: placerId });
    vi.advanceTimersByTime(CHALLENGE_WINDOW_SECONDS * 1_000 + 1);

    const roomState = roomRegistry.getRoomStateForMember("host-socket", TEST_ROOM_ID);
    expect(roomState.status).toBe("turn");
    expect(roomState.challengeState).toBeNull();
    expect(roomState.turn?.activePlayerId).toBe(challengerId);
  });

  it("ends a claimed challenge and moves on when the placing player is kicked", () => {
    vi.useFakeTimers();
    const { roomRegistry, placerId, challengerId } = startGameWithGuestOnTurn({
      isChallengeEnabled: true,
    });
    roomRegistry.placeCard("placer-socket", { roomId: TEST_ROOM_ID, selectedSlotIndex: 1 });
    roomRegistry.claimChallenge("challenger-socket", { roomId: TEST_ROOM_ID });

    roomRegistry.kickPlayer("host-socket", { roomId: TEST_ROOM_ID, playerId: placerId });
    vi.advanceTimersByTime(CHALLENGE_WINDOW_SECONDS * 1_000 + 1);

    const roomState = roomRegistry.getRoomStateForMember("host-socket", TEST_ROOM_ID);
    expect(roomState.status).toBe("turn");
    expect(roomState.turn?.activePlayerId).toBe(challengerId);
    expect(roomState.players.find((player) => player.id === challengerId)?.ttTokenCount).toBe(1);
  });

  it("does not leave the game stuck in the reveal when the revealed player is kicked", () => {
    const { roomRegistry, placerId, challengerId } = startGameWithGuestOnTurn({
      isChallengeEnabled: false,
    });
    roomRegistry.placeCard("placer-socket", { roomId: TEST_ROOM_ID, selectedSlotIndex: 1 });

    roomRegistry.kickPlayer("host-socket", { roomId: TEST_ROOM_ID, playerId: placerId });

    const roomState = roomRegistry.getRoomStateForMember("host-socket", TEST_ROOM_ID);
    expect(roomState.status).toBe("turn");
    expect(roomState.revealState).toBeNull();
    expect(roomState.turn?.activePlayerId).toBe(challengerId);
  });
});

describe("removing a player from a running game without a kick", () => {
  it("keeps a lobby player reserved when their reconnect grace expires after the start", () => {
    vi.useFakeTimers();
    const reconnectGracePeriodMs = 1_000;
    const roomRegistry = new RoomRegistry(undefined, reconnectGracePeriodMs);
    roomRegistry.createRoom(TEST_ROOM_ID, "Player One", "host-socket", "host-session");
    const guest = roomRegistry.addPlayerToRoom(
      TEST_ROOM_ID,
      "Player Two",
      "guest-socket",
      "guest-session",
    );
    roomRegistry.removePlayerBySocketId("guest-socket");
    roomRegistry.startGame(
      "host-socket",
      { roomId: TEST_ROOM_ID },
      buildYearDeck([1980, 1990, 2000, 2010, 2020, 2030, 2040], "kick-track"),
    );

    vi.advanceTimersByTime(reconnectGracePeriodMs + 1);

    const roomState = roomRegistry.getRoomStateForMember("host-socket", TEST_ROOM_ID);
    expect(roomState.players.map((player) => player.id)).toContain(guest.playerId);
    expect(roomState.timelines[guest.playerId]).toBeDefined();
    expect(
      roomRegistry.addPlayerToRoom(TEST_ROOM_ID, "Player Two", "guest-socket-2", "guest-session")
        .playerId,
    ).toBe(guest.playerId);
  });

  it("removes the player from the game when their session opens another room", () => {
    const { roomRegistry, placerId, challengerId } = startGameWithGuestOnTurn({
      isChallengeEnabled: false,
    });

    roomRegistry.createRoom("TEST_ROOM_2", "Player Two", "placer-socket-2", "placer-session");

    const roomState = roomRegistry.getRoomStateForMember("host-socket", TEST_ROOM_ID);
    expect(roomState.players.map((player) => player.id)).not.toContain(placerId);
    expect(roomState.timelines[placerId]).toBeUndefined();
    expect(roomState.turn?.activePlayerId).toBe(challengerId);
  });
});

describe("host skip during a claimed challenge", () => {
  it("cancels the challenge, keeps the challenger's TT and passes the turn on", () => {
    const { roomRegistry, challengerId } = startGameWithGuestOnTurn({ isChallengeEnabled: true });
    roomRegistry.placeCard("placer-socket", { roomId: TEST_ROOM_ID, selectedSlotIndex: 1 });
    roomRegistry.claimChallenge("challenger-socket", { roomId: TEST_ROOM_ID });

    const roomState = roomRegistry.skipTurn("host-socket", { roomId: TEST_ROOM_ID });

    expect(roomState.status).toBe("turn");
    expect(roomState.challengeState).toBeNull();
    expect(roomState.turn?.activePlayerId).toBe(challengerId);
    expect(roomState.players.find((player) => player.id === challengerId)?.ttTokenCount).toBe(1);
  });
});
