import { type GameTrackCard } from "@tunetrack/game-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestRoomCore } from "./support/roomCore.js";

const challengeDeck: GameTrackCard[] = [
  {
    id: "test-track-1",
    title: "Older Song",
    artist: "Test Artist 1",
    albumTitle: "Test Album 1",
    genre: "Rock",
    releaseYear: 1980,
  },
  {
    id: "test-track-2",
    title: "Newer Song",
    artist: "Test Artist 2",
    albumTitle: "Test Album 2",
    genre: "Soul",
    releaseYear: 2000,
  },
  {
    id: "test-track-3",
    title: "Middle Song",
    artist: "Test Artist 3",
    albumTitle: "Test Album 3",
    genre: "Pop",
    releaseYear: 1990,
  },
  {
    id: "test-track-4",
    title: "Newest Song",
    artist: "Test Artist 4",
    albumTitle: "Test Album 4",
    genre: "Disco",
    releaseYear: 2010,
  },
];

describe("challenge flow", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens a challenge window and lets the host manually resolve it when nobody claims Beat!", () => {
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "challenge-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomCore.lobby.addPlayerToRoom(
      "challenge-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.lobby.updateRoomSettings("host-socket", "challenge-room", {
      roomId: "challenge-room",
      targetTimelineCardCount: 12,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 0,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: null,
    });

    roomCore.gameplay.startGame("host-socket", { roomId: "challenge-room" }, challengeDeck);

    const challengeState = roomCore.gameplay.placeCard("host-socket", {
      roomId: "challenge-room",
      selectedSlotIndex: 0,
    });

    expect(challengeState.status).toBe("challenge");
    expect(challengeState.challengeState).toEqual({
      phase: "open",
      originalPlayerId: hostJoin.playerId,
      originalSelectedSlotIndex: 0,
      challengerPlayerId: null,
      challengeDeadlineEpochMs: null,
      challengerSelectedSlotIndex: null,
    });

    const revealState = roomCore.gameplay.resolveChallengeWindow("host-socket", {
      roomId: "challenge-room",
    });

    expect(revealState.status).toBe("reveal");
    expect(revealState.revealState).toEqual({
      playerId: hostJoin.playerId,
      placedCard: {
        id: "test-track-3",
        title: "Middle Song",
        artist: "Test Artist 3",
        albumTitle: "Test Album 3",
        genre: "Pop",
        releaseYear: 1990,
        revealedYear: 1990,
      },
      selectedSlotIndex: 0,
      wasCorrect: false,
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: null,
      awardedSlotIndex: null,
    });
  });

  it("lets the active player resolve the challenge window when reveal confirmation allows it", () => {
    const roomCore = createTestRoomCore();
    roomCore.lobby.createRoom("active-resolve-room", "Host Player", "host-socket", "host-session");
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "active-resolve-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.lobby.updateRoomSettings("host-socket", "active-resolve-room", {
      roomId: "active-resolve-room",
      targetTimelineCardCount: 12,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 0,
      revealConfirmMode: "host_or_active_player",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: null,
    });

    roomCore.gameplay.startGame("host-socket", { roomId: "active-resolve-room" }, challengeDeck);
    roomCore.gameplay.placeCard("host-socket", {
      roomId: "active-resolve-room",
      selectedSlotIndex: 0,
    });
    roomCore.gameplay.resolveChallengeWindow("host-socket", {
      roomId: "active-resolve-room",
    });
    roomCore.gameplay.confirmReveal("host-socket", {
      roomId: "active-resolve-room",
    });
    roomCore.gameplay.placeCard("guest-socket", {
      roomId: "active-resolve-room",
      selectedSlotIndex: 0,
    });

    const revealState = roomCore.gameplay.resolveChallengeWindow("guest-socket", {
      roomId: "active-resolve-room",
    });

    expect(revealState.status).toBe("reveal");
    expect(revealState.revealState?.playerId).toBe(guestJoin.playerId);
  });

  it("lets a guest with TT claim Beat! and resolve a successful challenge", () => {
    const roomCore = createTestRoomCore();
    const hostJoin = roomCore.lobby.createRoom(
      "challenge-claim-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "challenge-claim-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.lobby.updateRoomSettings("host-socket", "challenge-claim-room", {
      roomId: "challenge-claim-room",
      targetTimelineCardCount: 12,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 1,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: null,
    });

    const startedGameState = roomCore.gameplay.startGame(
      "host-socket",
      { roomId: "challenge-claim-room" },
      challengeDeck,
    );

    expect(
      startedGameState.players.find((player) => player.id === guestJoin.playerId)?.ttTokenCount,
    ).toBe(1);

    roomCore.gameplay.placeCard("host-socket", {
      roomId: "challenge-claim-room",
      selectedSlotIndex: 0,
    });

    const claimedChallengeState = roomCore.gameplay.claimChallenge("guest-socket", {
      roomId: "challenge-claim-room",
    });

    expect(claimedChallengeState.challengeState).toEqual({
      phase: "claimed",
      originalPlayerId: hostJoin.playerId,
      originalSelectedSlotIndex: 0,
      challengerPlayerId: guestJoin.playerId,
      challengeDeadlineEpochMs: null,
      challengerSelectedSlotIndex: null,
    });

    const revealState = roomCore.gameplay.placeChallenge("guest-socket", {
      roomId: "challenge-claim-room",
      selectedSlotIndex: 1,
    });

    expect(revealState.status).toBe("reveal");
    expect(revealState.revealState).toEqual({
      playerId: hostJoin.playerId,
      placedCard: {
        id: "test-track-3",
        title: "Middle Song",
        artist: "Test Artist 3",
        albumTitle: "Test Album 3",
        genre: "Pop",
        releaseYear: 1990,
        revealedYear: 1990,
      },
      selectedSlotIndex: 0,
      wasCorrect: false,
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: guestJoin.playerId,
      challengerSelectedSlotIndex: 1,
      challengeWasSuccessful: true,
      challengerTtChange: -1,
      awardedPlayerId: guestJoin.playerId,
      awardedSlotIndex: 0,
    });
    expect(
      revealState.players.find((player) => player.id === guestJoin.playerId)?.ttTokenCount,
    ).toBe(0);
    expect(revealState.timelines[hostJoin.playerId]).toEqual([
      {
        id: "test-track-1",
        title: "Older Song",
        artist: "Test Artist 1",
        albumTitle: "Test Album 1",
        genre: "Rock",
        releaseYear: 1980,
        revealedYear: 1980,
      },
    ]);
    expect(revealState.timelines[guestJoin.playerId]).toEqual([
      {
        id: "test-track-3",
        title: "Middle Song",
        artist: "Test Artist 3",
        albumTitle: "Test Album 3",
        genre: "Pop",
        releaseYear: 1990,
        revealedYear: 1990,
      },
      {
        id: "test-track-2",
        title: "Newer Song",
        artist: "Test Artist 2",
        albumTitle: "Test Album 2",
        genre: "Soul",
        releaseYear: 2000,
        revealedYear: 2000,
      },
    ]);
  });

  it("auto-resolves a timed Beat! window after the deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T12:00:00.000Z"));

    const roomCore = createTestRoomCore();
    let latestRoomState = null as
      | ReturnType<(typeof roomCore.lobby)["createRoom"]>["roomState"]
      | null;

    roomCore.events.on("roomStateChanged", (roomState) => {
      latestRoomState = roomState;
    });

    roomCore.lobby.createRoom("timed-room", "Host Player", "host-socket", "host-session");
    roomCore.lobby.addPlayerToRoom("timed-room", "Guest Player", "guest-socket", "guest-session");

    roomCore.lobby.updateRoomSettings("host-socket", "timed-room", {
      roomId: "timed-room",
      targetTimelineCardCount: 12,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 1,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: 1,
    });

    roomCore.gameplay.startGame("host-socket", { roomId: "timed-room" }, challengeDeck);
    const challengeState = roomCore.gameplay.placeCard("host-socket", {
      roomId: "timed-room",
      selectedSlotIndex: 0,
    });

    expect(challengeState.status).toBe("challenge");

    vi.advanceTimersByTime(1_001);

    expect(latestRoomState?.status).toBe("reveal");
    expect(latestRoomState?.challengeState).toBeNull();
    expect(latestRoomState?.revealState).toEqual(
      expect.objectContaining({
        playerId: challengeState.challengeState?.originalPlayerId,
        challengerPlayerId: null,
      }),
    );
  });

  it("lets the Beat! owner place after the original timer would have expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T12:00:00.000Z"));

    const roomCore = createTestRoomCore();
    roomCore.lobby.createRoom("claimed-timed-room", "Host Player", "host-socket", "host-session");
    roomCore.lobby.addPlayerToRoom(
      "claimed-timed-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    roomCore.lobby.updateRoomSettings("host-socket", "claimed-timed-room", {
      roomId: "claimed-timed-room",
      targetTimelineCardCount: 12,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 1,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: 1,
    });

    roomCore.gameplay.startGame("host-socket", { roomId: "claimed-timed-room" }, challengeDeck);
    roomCore.gameplay.placeCard("host-socket", {
      roomId: "claimed-timed-room",
      selectedSlotIndex: 0,
    });
    roomCore.gameplay.claimChallenge("guest-socket", {
      roomId: "claimed-timed-room",
    });

    vi.advanceTimersByTime(5_000);

    const revealState = roomCore.gameplay.placeChallenge("guest-socket", {
      roomId: "claimed-timed-room",
      selectedSlotIndex: 1,
    });

    expect(revealState.status).toBe("reveal");
    expect(revealState.revealState).toEqual(
      expect.objectContaining({
        challengerPlayerId: expect.any(String),
        challengeWasSuccessful: true,
      }),
    );
  });
});
