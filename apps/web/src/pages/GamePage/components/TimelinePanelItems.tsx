import { memo, useMemo } from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import type { GamePageCard, TimelinePanelItemsModel } from "../GamePage.types";
import { buildTimelineSortableItemViewModels } from "../gamePageTimelineItemViewModels";
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

function TimelinePanelItemsComponent({
  isDraggingPreviewCard,
  model,
  orderedItemIds,
  onPreviewCardRef,
  timelineItemMap,
}: TimelinePanelItemsProps) {
  const itemViewModels = useMemo(
    () => buildTimelineSortableItemViewModels(orderedItemIds, timelineItemMap, model),
    [model, orderedItemIds, timelineItemMap],
  );

  return (
    <SortableContext
      items={orderedItemIds}
      strategy={rectSortingStrategy}
    >
      {itemViewModels.map((item) => (
        <TimelineSortableItem
          card={item.card}
          challengeMarkerTone={model.challengeMarkerTone}
          hiddenCardMode={model.hiddenCardMode}
          id={item.id}
          isChallengeSlot={item.isChallengeSlot}
          isDraggingPreviewCard={isDraggingPreviewCard}
          isOriginalSlot={item.isOriginalSlot}
          isPreview={item.isPreview}
          isPreviewDisabled={item.isPreviewDisabled}
          key={item.id}
          selectable={model.selectable}
          showCorrectPlacementPreview={model.showCorrectPlacementPreview}
          showCorrectionPreview={model.showCorrectionPreview}
          showDevAlbumInfo={model.showDevAlbumInfo}
          showDevCardInfo={model.showDevCardInfo}
          showDevGenreInfo={model.showDevGenreInfo}
          showDevYearInfo={model.showDevYearInfo}
          theme={model.theme}
          {...(item.isPreview
            ? {
                previewCardRef: (node: HTMLElement | null) => {
                  onPreviewCardRef(node);
                },
              }
            : {})}
        />
      ))}
    </SortableContext>
  );
}

export const TimelinePanelItems = memo(TimelinePanelItemsComponent);
