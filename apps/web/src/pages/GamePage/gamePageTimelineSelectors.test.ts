import { describe, expect, it } from "vitest";
import type { PublicRoomState } from "@tunetrack/shared";
import {
  getGamePageActiveTimelinePreviewState,
  getGamePageRevealTimelineState,
} from "./gamePageTimelineSelectors";

function createRoomState(
  overrides: Partial<PublicRoomState> = {},
): PublicRoomState {
  return {
    roomId: "ROOM1",
    status: "turn",
    hostId: "player-1",
    players: [
      {
        displayName: "Alice",
        id: "player-1",
        isHost: true,
        startingTimelineCardCount: 1,
        ttTokenCount: 2,
      },
      {
        displayName: "Bob",
        id: "player-2",
        isHost: false,
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
    },
    turn: {
      activePlayerId: "player-1",
      hasUsedSkipTrackWithTt: false,
      turnNumber: 2,
    },
    challengeState: null,
    revealState: null,
    winnerPlayerId: null,
    ...overrides,
  };
}

describe("gamePageTimelineSelectors", () => {
  it("derives active challenge preview state for the challenger", () => {
    const roomState = createRoomState({
      challengeState: {
        challengeDeadlineEpochMs: null,
        challengerPlayerId: "player-2",
        challengerSelectedSlotIndex: null,
        originalPlayerId: "player-1",
        originalSelectedSlotIndex: 1,
        phase: "claimed",
      },
      status: "challenge",
    });

    expect(
      getGamePageActiveTimelinePreviewState({
        canSelectChallengeSlot: true,
        canSelectTurnSlot: false,
        locallyPlacedCard: null,
        roomState,
        selectedSlotIndex: 4,
      }),
    ).toEqual({
      activeTimelineChallengeSlot: 4,
      activeTimelineOriginalSlot: 1,
      activeTimelinePreviewCard: roomState.currentTrackCard,
      activeTimelinePreviewSlot: 4,
    });
  });

  it("keeps wrong reveal previews in the chosen slot", () => {
    const roomState = createRoomState({
      revealState: {
        awardedPlayerId: null,
        awardedSlotIndex: null,
        challengeWasSuccessful: false,
        challengerPlayerId: null,
        challengerSelectedSlotIndex: null,
        challengerTtChange: 0,
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
        validSlotIndexes: [3],
        wasCorrect: false,
      },
      status: "reveal",
    });

    expect(
      getGamePageRevealTimelineState({
        currentPlayerId: "player-2",
        roomState,
      }),
    ).toEqual({
      ownTimelineChallengeAwardSlot: null,
      ownTimelineOriginalAwardSlot: null,
      revealPreviewCard: roomState.revealState?.placedCard ?? null,
      revealPreviewSlot: 2,
      showCorrectPlacementPreview: false,
      showCorrectionPreview: true,
    });
  });

  it("derives awarded own timeline slot for a successful challenger reveal", () => {
    const roomState = createRoomState({
      revealState: {
        awardedPlayerId: "player-2",
        awardedSlotIndex: 5,
        challengeWasSuccessful: true,
        challengerPlayerId: "player-2",
        challengerSelectedSlotIndex: 5,
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
        validSlotIndexes: [5],
        wasCorrect: false,
      },
      status: "reveal",
    });

    expect(
      getGamePageRevealTimelineState({
        currentPlayerId: "player-2",
        roomState,
      }),
    ).toMatchObject({
      ownTimelineChallengeAwardSlot: 5,
      ownTimelineOriginalAwardSlot: null,
    });
  });

  it("shows correct placement preview in reveal even when TT mode is enabled", () => {
    const roomState = createRoomState({
      settings: {
        ...createRoomState().settings,
        ttModeEnabled: true,
      },
      revealState: {
        awardedPlayerId: null,
        awardedSlotIndex: null,
        challengeWasSuccessful: null,
        challengerPlayerId: null,
        challengerSelectedSlotIndex: null,
        challengerTtChange: 0,
        placedCard: {
          albumTitle: "Album",
          artist: "Artist",
          id: "track-3",
          releaseYear: 2003,
          title: "Correct Song",
        },
        playerId: "player-1",
        revealType: "placement",
        selectedSlotIndex: 1,
        validSlotIndexes: [1],
        wasCorrect: true,
      },
      status: "reveal",
    });

    expect(
      getGamePageRevealTimelineState({
        currentPlayerId: "player-1",
        roomState,
      }),
    ).toMatchObject({
      showCorrectPlacementPreview: true,
      showCorrectionPreview: false,
    });
  });
});
