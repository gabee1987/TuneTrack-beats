import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { GamePageCard, TimelinePanelItemsModel } from "../GamePage.types";
import { TimelineSortableItem } from "./TimelineSortableItem";

interface TimelinePanelItemsProps {
  isDraggingPreviewCard: boolean;
  model: TimelinePanelItemsModel;
  orderedItemIds: string[];
  onPreviewCardRef: (node: HTMLElement | null) => void;
  timelineItemMap: Map<
    string,
    | {
        type: "preview";
        card: GamePageCard;
      }
    | {
        type: "timeline";
        card: GamePageCard;
      }
  >;
}

export function TimelinePanelItems({
  isDraggingPreviewCard,
  model,
  orderedItemIds,
  onPreviewCardRef,
  timelineItemMap,
}: TimelinePanelItemsProps) {
  const {
    challengeMarkerTone,
    challengerChosenSlotIndex,
    disabledSlotIndexes,
    hiddenCardMode,
    originalChosenSlotIndex,
    selectable,
    showCorrectPlacementPreview,
    showCorrectionPreview,
    showDevAlbumInfo,
    showDevCardInfo,
    showDevGenreInfo,
    showDevYearInfo,
    theme,
  } = model;

  return (
    <SortableContext
      items={orderedItemIds}
      strategy={horizontalListSortingStrategy}
    >
      {orderedItemIds.map((itemId) => {
        const item = timelineItemMap.get(itemId);

        if (!item) {
          return null;
        }

        const itemIndex = orderedItemIds.indexOf(itemId);
        const isOriginalSlot =
          originalChosenSlotIndex !== null &&
          item.type === "preview" &&
          itemIndex === originalChosenSlotIndex;
        const isChallengeSlot =
          challengerChosenSlotIndex !== null &&
          item.type === "preview" &&
          itemIndex === challengerChosenSlotIndex;

        return (
          <TimelineSortableItem
            card={item.card}
            challengeMarkerTone={challengeMarkerTone}
            hiddenCardMode={hiddenCardMode}
            id={itemId}
            isChallengeSlot={isChallengeSlot}
            isDraggingPreviewCard={isDraggingPreviewCard}
            isOriginalSlot={isOriginalSlot}
            isPreview={item.type === "preview"}
            isPreviewDisabled={
              item.type === "preview" && disabledSlotIndexes.includes(itemIndex)
            }
            key={itemId}
            selectable={selectable}
            showCorrectPlacementPreview={showCorrectPlacementPreview}
            showCorrectionPreview={showCorrectionPreview}
            showDevAlbumInfo={showDevAlbumInfo}
            showDevCardInfo={showDevCardInfo}
            showDevGenreInfo={showDevGenreInfo}
            showDevYearInfo={showDevYearInfo}
            theme={theme}
            {...(item.type === "preview"
              ? {
                  previewCardRef: (node: HTMLElement | null) => {
                    onPreviewCardRef(node);
                  },
                }
              : {})}
          />
        );
      })}
    </SortableContext>
  );
}
