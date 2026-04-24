import { describe, expect, it } from "vitest";
import {
  detectSkipTrackPreviewTransitionEvent,
  detectTimelineCelebrationTransitionEvent,
  detectTimelinePreviewTransitionEvent,
} from "./gamePageTransitionEventDetectors";

describe("gamePageTransitionEventDetectors", () => {
  it("detects skip-track preview replacement only after the backend confirms the next track", () => {
    expect(
      detectSkipTrackPreviewTransitionEvent({
        currentTrackId: "track-new",
        eventKey: 2,
        pendingSkippedTrackId: "track-old",
        roomStatus: "turn",
      }),
    ).toEqual({
      eventKey: 2,
      nextCardId: "track-new",
      previousCardId: "track-old",
      reason: "skip_track_replace",
    });

    expect(
      detectSkipTrackPreviewTransitionEvent({
        currentTrackId: "track-old",
        eventKey: 2,
        pendingSkippedTrackId: "track-old",
        roomStatus: "turn",
      }),
    ).toBeNull();
  });

  it("detects timeline celebration transitions only when the reveal produces a message", () => {
    expect(
      detectTimelineCelebrationTransitionEvent({
        celebrationCard: null,
        celebrationKey: "reveal-7",
        celebrationMessage: "Challenge won.",
        celebrationTone: "success",
        eventKey: 5,
        shouldAnimateCardToMine: true,
      }),
    ).toMatchObject({
      celebrationKey: "reveal-7",
      eventKey: 5,
      message: "Challenge won.",
      reason: "challenge_success_celebration",
    });

    expect(
      detectTimelineCelebrationTransitionEvent({
        celebrationCard: null,
        celebrationKey: null,
        celebrationMessage: null,
        celebrationTone: "success",
        eventKey: 5,
        shouldAnimateCardToMine: false,
      }),
    ).toBeNull();
  });

  it("detects reveal preview transitions from backend-confirmed reveal state", () => {
    expect(
      detectTimelinePreviewTransitionEvent({
        eventKey: 9,
        previewCard: {
          albumTitle: "Album",
          artist: "Artist",
          id: "track-9",
          releaseYear: 2009,
          title: "Reveal Song",
        },
        previewSlot: 3,
        revealPreviewKey: "room:9:reveal-correct",
        showCorrectPlacementPreview: true,
        showCorrectionPreview: false,
      }),
    ).toEqual({
      eventKey: 9,
      previewCard: {
        albumTitle: "Album",
        artist: "Artist",
        id: "track-9",
        releaseYear: 2009,
        title: "Reveal Song",
      },
      previewSlot: 3,
      reason: "reveal_correct_preview",
      showCorrectPlacementPreview: true,
      showCorrectionPreview: false,
      showRevealedContent: false,
    });

    expect(
      detectTimelinePreviewTransitionEvent({
        eventKey: 9,
        previewCard: null,
        previewSlot: null,
        revealPreviewKey: null,
        showCorrectPlacementPreview: false,
        showCorrectionPreview: false,
      }),
    ).toBeNull();
  });
});
