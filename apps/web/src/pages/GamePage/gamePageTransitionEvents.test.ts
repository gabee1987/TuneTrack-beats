import { describe, expect, it } from "vitest";
import {
  createSkipTrackPreviewCardTransitionEvent,
  createTimelineCelebrationTransitionEvent,
  createTimelinePreviewTransitionEvent,
} from "./gamePageTransitionEvents";

describe("gamePageTransitionEvents", () => {
  it("builds an explicit skip-track preview transition event", () => {
    expect(
      createSkipTrackPreviewCardTransitionEvent(3, "track-old", "track-new"),
    ).toEqual({
      eventKey: 3,
      nextCardId: "track-new",
      previousCardId: "track-old",
      reason: "skip_track_replace",
    });
  });

  it("builds an explicit timeline celebration transition event", () => {
    expect(
      createTimelineCelebrationTransitionEvent({
        celebrationCard: {
          albumTitle: "Album",
          artist: "Artist",
          id: "timeline-card-3",
          revealedYear: 2004,
          title: "Track",
        },
        celebrationKey: "celebration-1",
        eventKey: 7,
        message: "Beat confirmed",
        shouldAnimateCardToMine: true,
        tone: "success",
      }),
    ).toEqual({
      celebrationCard: {
        albumTitle: "Album",
        artist: "Artist",
        id: "timeline-card-3",
        revealedYear: 2004,
        title: "Track",
      },
      celebrationKey: "celebration-1",
      eventKey: 7,
      message: "Beat confirmed",
      reason: "challenge_success_celebration",
      shouldAnimateCardToMine: true,
      tone: "success",
    });
  });

  it("builds an explicit timeline preview transition event", () => {
    expect(
      createTimelinePreviewTransitionEvent({
        eventKey: 11,
        previewCard: {
          albumTitle: "Album",
          artist: "Artist",
          id: "track-11",
          releaseYear: 2011,
          title: "Track",
        },
        previewSlot: 2,
        reason: "reveal_correction_preview",
        showCorrectPlacementPreview: false,
        showCorrectionPreview: true,
        showRevealedContent: true,
      }),
    ).toEqual({
      eventKey: 11,
      previewCard: {
        albumTitle: "Album",
        artist: "Artist",
        id: "track-11",
        releaseYear: 2011,
        title: "Track",
      },
      previewSlot: 2,
      reason: "reveal_correction_preview",
      showCorrectPlacementPreview: false,
      showCorrectionPreview: true,
      showRevealedContent: true,
    });
  });
});
