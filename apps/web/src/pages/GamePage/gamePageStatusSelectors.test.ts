import { describe, expect, it } from "vitest";
import type { PublicRoomState } from "@tunetrack/shared";
import {
  getGamePageChallengeStatusState,
  getGamePageStatusCopyState,
} from "./gamePageStatusSelectors";

function createRoomState(overrides: Partial<PublicRoomState> = {}): PublicRoomState {
  return {
    roomId: "ROOM1",
    status: "turn",
    hostId: "player-1",
    players: [
      {
        displayName: "Alice",
        id: "player-1",
        isHost: true,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        startingTimelineCardCount: 1,
        ttTokenCount: 2,
      },
      {
        displayName: "Bob",
        id: "player-2",
        isHost: false,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        startingTimelineCardCount: 1,
        ttTokenCount: 1,
      },
    ],
    timelines: {
      "player-1": [],
      "player-2": [],
    },
    currentTrackCard: {
      albumTitle: "Album",
      artist: "Artist",
      id: "track-1",
      releaseYear: 2000,
      title: "Song",
    },
    targetTimelineCardCount: 10,
    settings: {
      challengeWindowDurationSeconds: 10,
      defaultStartingTimelineCardCount: 1,
      revealConfirmMode: "host_only",
      startingTtTokenCount: 0,
      targetTimelineCardCount: 10,
      ttModeEnabled: false,
      playlistImported: false,
      importedTrackCount: 0,
      spotifyAuthStatus: "none",
      spotifyAccountType: null,
    },
    turn: {
      activePlayerId: "player-1",
      hasUsedSkipTrackWithTt: false,
      turnNumber: 2,
      turnSkipDeadlineEpochMs: null,
    },
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
    ...overrides,
  };
}

const getPlayerName = (playerId: string | null | undefined) =>
  playerId === "player-1" ? "Alice" : playerId === "player-2" ? "Bob" : "Unknown";
const getPossessivePlayerName = (playerId: string | null | undefined) =>
  playerId === "player-1" ? "Alice's" : playerId === "player-2" ? "Bob's" : "Unknown player's";
const translations: Record<string, string> = {
  "game.status.beatAvailable": "Beat available",
  "game.status.chooseChallengeSlot": "Choose the slot you want to challenge.",
  "game.status.chosenSlot": "Chosen slot: {{slot}}",
  "game.status.cleanBeat": "Clean Beat!",
  "game.status.countdownBeat": "{{seconds}}s left to call Beat!",
  "game.status.youCalledBeat":
    "You called Beat! Pick the slot where the card should have gone in {{playerName}} timeline.",
  "game.status.youClaimedBeat": "You claimed Beat! Choose the slot you believe is correct.",
  "game.status.playerOwnsBeat": "{{playerName}} owns Beat!",
};
const t = (key: string, params?: Record<string, string | number>) =>
  Object.entries(params ?? {}).reduce(
    (message, [paramKey, value]) => message.replace(`{{${paramKey}}}`, String(value)),
    translations[key] ?? key,
  );

describe("gamePageStatusSelectors", () => {
  it("derives open challenge action state for observers", () => {
    const roomState = createRoomState({
      challengeState: {
        challengeDeadlineEpochMs: 15_000,
        challengerPlayerId: null,
        challengerSelectedSlotIndex: null,
        originalPlayerId: "player-1",
        originalSelectedSlotIndex: 3,
        phase: "open",
      },
      status: "challenge",
    });

    expect(
      getGamePageChallengeStatusState({
        canSelectChallengeSlot: false,
        challengeOwnerId: null,
        challengeSuccessCelebrationCard: null,
        currentPlayerId: "player-2",
        getPlayerName,
        isCurrentPlayerTurn: false,
        nowEpochMs: 11_200,
        roomState,
        t,
      }),
    ).toEqual({
      challengeActionBody: "Chosen slot: 3",
      challengeActionTitle: "Beat available",
      challengeCountdownLabel: "4s left to call Beat!",
      challengeMarkerTone: "pending",
      challengeSuccessMessage: null,
    });
  });

  it("derives claimed challenge copy for the challenger", () => {
    const roomState = createRoomState({
      challengeState: {
        challengeDeadlineEpochMs: null,
        challengerPlayerId: "player-2",
        challengerSelectedSlotIndex: null,
        originalPlayerId: "player-1",
        originalSelectedSlotIndex: 2,
        phase: "claimed",
      },
      status: "challenge",
    });

    expect(
      getGamePageStatusCopyState({
        activePlayerId: "player-1",
        challengeOwnerId: "player-2",
        currentPlayerId: "player-2",
        canSelectChallengeSlot: true,
        getPlayerName,
        getPossessivePlayerName,
        isCurrentPlayerTurn: false,
        roomState,
        t,
      }),
    ).toEqual({
      activeTimelineHint:
        "You called Beat! Pick the slot where the card should have gone in Alice's timeline.",
      statusBadgeText: "Bob owns Beat!",
      statusDetailText: "You claimed Beat! Choose the slot you believe is correct.",
    });
  });

  it("removes current-turn instructional clutter", () => {
    const roomState = createRoomState();

    expect(
      getGamePageStatusCopyState({
        activePlayerId: "player-1",
        challengeOwnerId: null,
        currentPlayerId: "player-1",
        canSelectChallengeSlot: false,
        getPlayerName,
        getPossessivePlayerName,
        isCurrentPlayerTurn: true,
        roomState,
        t,
      }),
    ).toMatchObject({
      activeTimelineHint: "",
      statusDetailText: "",
    });
  });

  it("derives reveal success marker and celebration copy", () => {
    const roomState = createRoomState({
      revealState: {
        awardedPlayerId: "player-2",
        awardedSlotIndex: 4,
        challengeWasSuccessful: true,
        challengerPlayerId: "player-2",
        challengerSelectedSlotIndex: 4,
        challengerTtChange: 1,
        placedCard: {
          albumTitle: "Album",
          artist: "Artist",
          id: "track-2",
          releaseYear: 2002,
          title: "Reveal Song",
        },
        playerId: "player-1",
        revealType: "placement",
        selectedSlotIndex: 2,
        validSlotIndexes: [4],
        wasCorrect: false,
      },
      status: "reveal",
    });

    const result = getGamePageChallengeStatusState({
      canSelectChallengeSlot: false,
      challengeOwnerId: "player-2",
      challengeSuccessCelebrationCard: roomState.revealState?.placedCard ?? null,
      currentPlayerId: "player-2",
      getPlayerName,
      isCurrentPlayerTurn: false,
      nowEpochMs: 0,
      roomState,
      t,
    });

    expect(result.challengeMarkerTone).toBe("success");
    expect(result.challengeSuccessMessage).toBe("Clean Beat!");
  });
});
