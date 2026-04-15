import { describe, expect, it } from "vitest";
import type { TimelineCardPublic, TrackCardPublic } from "@tunetrack/shared";
import { buildTimelineItemMap } from "./gamePageTimelineItems";
import { buildTimelineSortableItemViewModels } from "./gamePageTimelineItemViewModels";

function createTimelineCard(id: string): TimelineCardPublic {
  return {
    albumTitle: `Album ${id}`,
    artist: `Artist ${id}`,
    id,
    revealedYear: 2000,
    title: `Track ${id}`,
  };
}

function createPreviewCard(): TrackCardPublic {
  return {
    albumTitle: "Preview album",
    artist: "Preview artist",
    id: "preview-1",
    title: "Preview track",
  };
}

describe("gamePageTimelineItemViewModels", () => {
  it("builds preview and timeline slot flags from ordered item ids", () => {
    const orderedItemIds = ["timeline-card-a-0", "timeline-preview-card", "timeline-card-b-1"];
    const timelineItemMap = buildTimelineItemMap(
      [createTimelineCard("a"), createTimelineCard("b")],
      createPreviewCard(),
    );

    const viewModels = buildTimelineSortableItemViewModels(orderedItemIds, timelineItemMap, {
      challengeMarkerTone: "pending",
      challengerChosenSlotIndex: 1,
      disabledSlotIndexes: [1],
      hiddenCardMode: "artwork",
      originalChosenSlotIndex: 1,
      selectable: true,
      showCorrectPlacementPreview: false,
      showCorrectionPreview: false,
      showDevAlbumInfo: false,
      showDevCardInfo: false,
      showDevGenreInfo: false,
      showDevYearInfo: false,
      theme: "dark",
    });

    expect(viewModels).toHaveLength(3);
    expect(viewModels[0]).toMatchObject({
      id: "timeline-card-a-0",
      isPreview: false,
      isChallengeSlot: false,
      isOriginalSlot: false,
      isPreviewDisabled: false,
    });
    expect(viewModels[1]).toMatchObject({
      id: "timeline-preview-card",
      isPreview: true,
      isChallengeSlot: true,
      isOriginalSlot: true,
      isPreviewDisabled: true,
    });
  });
});
