import type { GamePageCard, TimelinePanelItemsModel } from "./GamePage.types";
import type { TimelinePanelItem } from "./gamePageTimelineItems";

export interface TimelineSortableItemViewModel {
  card: GamePageCard;
  id: string;
  isChallengeSlot: boolean;
  isOriginalSlot: boolean;
  isPreview: boolean;
  isPreviewDisabled: boolean;
}

export function buildTimelineSortableItemViewModels(
  orderedItemIds: string[],
  timelineItemMap: Map<string, TimelinePanelItem>,
  model: TimelinePanelItemsModel,
): TimelineSortableItemViewModel[] {
  return orderedItemIds.flatMap((itemId, itemIndex) => {
    const item = timelineItemMap.get(itemId);

    if (!item) {
      return [];
    }

    const isPreview = item.type === "preview";

    return [
      {
        card: item.card,
        id: itemId,
        isChallengeSlot:
          model.challengerChosenSlotIndex !== null &&
          isPreview &&
          itemIndex === model.challengerChosenSlotIndex,
        isOriginalSlot:
          model.originalChosenSlotIndex !== null &&
          isPreview &&
          itemIndex === model.originalChosenSlotIndex,
        isPreview,
        isPreviewDisabled: isPreview && model.disabledSlotIndexes.includes(itemIndex),
      },
    ];
  });
}
