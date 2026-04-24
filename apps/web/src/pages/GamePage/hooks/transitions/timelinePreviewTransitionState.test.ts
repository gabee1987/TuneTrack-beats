import { describe, expect, it } from "vitest";
import {
  applyTimelinePreviewTransitionEvent,
  createTimelinePreviewDisplayState,
} from "./timelinePreviewTransitionState";

describe("timelinePreviewTransitionState", () => {
  it("creates display state from the current preview props", () => {
    const previewCard = {
      albumTitle: "Album",
      artist: "Artist",
      id: "track-1",
      releaseYear: 2001,
      title: "Track 1",
    };

    expect(
      createTimelinePreviewDisplayState({
        previewCard,
        previewSlot: 2,
        showCorrectPlacementPreview: false,
        showCorrectionPreview: true,
      }),
    ).toEqual({
      displayPreviewCard: previewCard,
      displayPreviewSlot: 2,
      displayShowCorrectPlacementPreview: false,
      displayShowCorrectionPreview: true,
      displayShowRevealedContent: true,
    });
  });

  it("applies the explicit transition-event snapshot as displayed state", () => {
    const previewCard = {
      albumTitle: "Album",
      artist: "Artist",
      id: "track-2",
      releaseYear: 2002,
      title: "Track 2",
    };

    expect(
      applyTimelinePreviewTransitionEvent({
        eventKey: 4,
        previewCard,
        previewSlot: 5,
        reason: "reveal_correction_preview",
        showCorrectPlacementPreview: false,
        showCorrectionPreview: true,
        showRevealedContent: true,
      }),
    ).toEqual({
      displayPreviewCard: previewCard,
      displayPreviewSlot: 5,
      displayShowCorrectPlacementPreview: false,
      displayShowCorrectionPreview: true,
      displayShowRevealedContent: true,
    });
  });
});
