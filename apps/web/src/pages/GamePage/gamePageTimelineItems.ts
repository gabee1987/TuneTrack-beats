import type { TimelineCardPublic } from "@tunetrack/shared";
import type { GamePageCard } from "./GamePage.types";

export const TIMELINE_PREVIEW_ITEM_ID = "timeline-preview-card";

export type TimelinePanelItem =
  | {
      type: "preview";
      card: GamePageCard;
    }
  | {
      type: "timeline";
      card: TimelineCardPublic;
    };

export function buildTimelineItemId(cardId: string, index: number): string {
  return `timeline-card-${cardId}-${index}`;
}

export function clampPreviewIndex(
  previewCard: GamePageCard | null,
  previewSlotIndex: number | null,
  selectedSlotIndex: number,
  timelineLength: number,
): number | null {
  if (!previewCard) {
    return null;
  }

  return Math.max(0, Math.min(previewSlotIndex ?? selectedSlotIndex, timelineLength));
}

export function buildBaseOrderedTimelineItemIds(
  timelineCards: TimelineCardPublic[],
  previewCard: GamePageCard | null,
  previewIndex: number | null,
): string[] {
  const itemIds = timelineCards.map((card, index) => buildTimelineItemId(card.id, index));

  if (previewCard && previewIndex !== null) {
    itemIds.splice(previewIndex, 0, TIMELINE_PREVIEW_ITEM_ID);
  }

  return itemIds;
}

export function buildTimelineItemMap(
  timelineCards: TimelineCardPublic[],
  previewCard: GamePageCard | null,
): Map<string, TimelinePanelItem> {
  const map = new Map<string, TimelinePanelItem>();

  timelineCards.forEach((card, index) => {
    map.set(buildTimelineItemId(card.id, index), {
      type: "timeline",
      card,
    });
  });

  if (previewCard) {
    map.set(TIMELINE_PREVIEW_ITEM_ID, {
      type: "preview",
      card: previewCard,
    });
  }

  return map;
}

export function buildOrderedTimelineItemIdsForPreviewIndex(
  timelineCards: TimelineCardPublic[],
  nextPreviewIndex: number,
): string[] {
  const itemIds = timelineCards.map((card, index) => buildTimelineItemId(card.id, index));
  itemIds.splice(nextPreviewIndex, 0, TIMELINE_PREVIEW_ITEM_ID);
  return itemIds;
}
