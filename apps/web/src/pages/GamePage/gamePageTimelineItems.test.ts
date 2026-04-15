import { describe, expect, it } from "vitest";
import type { TimelineCardPublic, TrackCardPublic } from "@tunetrack/shared";
import {
  TIMELINE_PREVIEW_ITEM_ID,
  buildBaseOrderedTimelineItemIds,
  buildOrderedTimelineItemIdsForPreviewIndex,
  buildTimelineItemId,
  buildTimelineItemMap,
  clampPreviewIndex,
} from "./gamePageTimelineItems";

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
    albumTitle: "Album",
    artist: "Preview Artist",
    genre: "Pop",
    id: "preview-1",
    releaseYear: 2001,
    title: "Preview Track",
  };
}

describe("gamePageTimelineItems", () => {
  it("builds stable timeline item ids", () => {
    expect(buildTimelineItemId("card-1", 2)).toBe("timeline-card-card-1-2");
  });

  it("clamps preview index inside the timeline bounds", () => {
    expect(clampPreviewIndex(createPreviewCard(), 99, 1, 3)).toBe(3);
    expect(clampPreviewIndex(createPreviewCard(), -2, 1, 3)).toBe(0);
    expect(clampPreviewIndex(null, 1, 1, 3)).toBeNull();
  });

  it("builds ordered ids with the preview inserted at the selected index", () => {
    const cards = [createTimelineCard("a"), createTimelineCard("b")];

    expect(buildBaseOrderedTimelineItemIds(cards, createPreviewCard(), 1)).toEqual([
      "timeline-card-a-0",
      TIMELINE_PREVIEW_ITEM_ID,
      "timeline-card-b-1",
    ]);
  });

  it("builds a timeline item map for timeline and preview cards", () => {
    const cards = [createTimelineCard("a"), createTimelineCard("b")];
    const previewCard = createPreviewCard();
    const itemMap = buildTimelineItemMap(cards, previewCard);

    expect(itemMap.get("timeline-card-a-0")).toEqual({
      type: "timeline",
      card: cards[0],
    });
    expect(itemMap.get(TIMELINE_PREVIEW_ITEM_ID)).toEqual({
      type: "preview",
      card: previewCard,
    });
  });

  it("builds reordered ids for drag preview movement", () => {
    const cards = [createTimelineCard("a"), createTimelineCard("b"), createTimelineCard("c")];

    expect(buildOrderedTimelineItemIdsForPreviewIndex(cards, 2)).toEqual([
      "timeline-card-a-0",
      "timeline-card-b-1",
      TIMELINE_PREVIEW_ITEM_ID,
      "timeline-card-c-2",
    ]);
  });
});
