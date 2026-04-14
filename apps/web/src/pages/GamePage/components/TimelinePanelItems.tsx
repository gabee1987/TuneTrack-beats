import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { ChallengeMarkerTone, GamePageCard } from "../GamePage.types";
import { TimelineSortableItem } from "./TimelineSortableItem";

interface TimelinePanelItemsProps {
  challengeMarkerTone: ChallengeMarkerTone;
  challengerChosenSlotIndex: number | null;
  disabledSlotIndexes: number[];
  hiddenCardMode: HiddenCardMode;
  isDraggingPreviewCard: boolean;
  orderedItemIds: string[];
  originalChosenSlotIndex: number | null;
  onPreviewCardRef: (node: HTMLElement | null) => void;
  selectable: boolean;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  theme: ThemeId;
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
  challengeMarkerTone,
  challengerChosenSlotIndex,
  disabledSlotIndexes,
  hiddenCardMode,
  isDraggingPreviewCard,
  orderedItemIds,
  originalChosenSlotIndex,
  onPreviewCardRef,
  selectable,
  showCorrectPlacementPreview,
  showCorrectionPreview,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevGenreInfo,
  showDevYearInfo,
  theme,
  timelineItemMap,
}: TimelinePanelItemsProps) {
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
