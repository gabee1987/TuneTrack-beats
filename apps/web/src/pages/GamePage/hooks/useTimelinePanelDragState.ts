import {
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TimelineCardPublic } from "@tunetrack/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DRAG_EDGE_SCROLL_MAX_STEP_PX,
  DRAG_EDGE_SCROLL_ZONE_PX,
  TIMELINE_REORDER_THROTTLE_MS,
} from "../gamePage.constants";
import type { GamePageCard } from "../GamePage.types";
import {
  TIMELINE_PREVIEW_ITEM_ID,
  buildBaseOrderedTimelineItemIds,
  buildOrderedTimelineItemIdsForPreviewIndex,
  buildTimelineItemMap,
  clampPreviewIndex,
} from "../gamePageTimelineItems";

interface UseTimelinePanelDragStateOptions {
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  selectedSlotIndex: number;
  timelineCards: TimelineCardPublic[];
  timelineRowRef: React.RefObject<HTMLDivElement | null>;
  onSelectSlot: (slotIndex: number) => void;
}

interface UseTimelinePanelDragStateResult {
  handleDragCancel: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragMove: (event: DragMoveEvent) => void;
  handleDragStart: (event: DragStartEvent) => void;
  isDraggingPreviewCard: boolean;
  orderedItemIds: string[];
  previewItemId: string;
  timelineItemMap: Map<
    string,
    | {
        type: "preview";
        card: GamePageCard;
      }
    | {
        type: "timeline";
        card: TimelineCardPublic;
      }
  >;
}

export function useTimelinePanelDragState({
  previewCard,
  previewSlotIndex,
  selectedSlotIndex,
  timelineCards,
  timelineRowRef,
  onSelectSlot,
}: UseTimelinePanelDragStateOptions): UseTimelinePanelDragStateResult {
  const [isDraggingPreviewCard, setIsDraggingPreviewCard] = useState(false);
  const lastPreviewReorderAtRef = useRef(0);

  const previewIndex = clampPreviewIndex(
    previewCard,
    previewSlotIndex,
    selectedSlotIndex,
    timelineCards.length,
  );

  const baseOrderedItemIds = useMemo(
    () => buildBaseOrderedTimelineItemIds(timelineCards, previewCard, previewIndex),
    [previewCard, previewIndex, timelineCards],
  );

  const [orderedItemIds, setOrderedItemIds] = useState<string[]>(baseOrderedItemIds);

  useEffect(() => {
    if (!isDraggingPreviewCard) {
      setOrderedItemIds(baseOrderedItemIds);
    }
  }, [baseOrderedItemIds, isDraggingPreviewCard]);

  const timelineItemMap = useMemo(
    () => buildTimelineItemMap(timelineCards, previewCard),
    [previewCard, timelineCards],
  );

  function syncPreviewIndexFromActiveRect(
    translatedRect: DragMoveEvent["active"]["rect"]["current"]["translated"] | null,
  ) {
    if (!translatedRect) {
      return;
    }

    const timelineRow = timelineRowRef.current;

    if (!timelineRow) {
      return;
    }

    const activeCenterX = translatedRect.left + translatedRect.width / 2;
    const renderedTimelineCards = Array.from(
      timelineRow.querySelectorAll<HTMLElement>("[data-timeline-card='true']"),
    );

    let nextPreviewIndex = 0;

    for (const timelineCard of renderedTimelineCards) {
      const cardRect = timelineCard.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;

      if (activeCenterX > cardCenterX) {
        nextPreviewIndex += 1;
      } else {
        break;
      }
    }

    if (orderedItemIds.indexOf(TIMELINE_PREVIEW_ITEM_ID) === nextPreviewIndex) {
      return;
    }

    const now = performance.now();

    if (now - lastPreviewReorderAtRef.current < TIMELINE_REORDER_THROTTLE_MS) {
      return;
    }

    const nextOrder = buildOrderedTimelineItemIdsForPreviewIndex(
      timelineCards,
      nextPreviewIndex,
    );

    lastPreviewReorderAtRef.current = now;
    setOrderedItemIds(nextOrder);
    onSelectSlot(nextPreviewIndex);
  }

  function handleDragStart(_: DragStartEvent) {
    lastPreviewReorderAtRef.current = 0;
    setIsDraggingPreviewCard(true);
  }

  function handleDragMove(event: DragMoveEvent) {
    const container = timelineRowRef.current;
    const translatedRect = event.active.rect.current.translated;

    if (!container || !translatedRect) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    let scrollLeft = 0;

    if (translatedRect.right > containerRect.right - DRAG_EDGE_SCROLL_ZONE_PX) {
      scrollLeft = Math.min(
        DRAG_EDGE_SCROLL_MAX_STEP_PX,
        (translatedRect.right - (containerRect.right - DRAG_EDGE_SCROLL_ZONE_PX)) /
          5,
      );
    } else if (
      translatedRect.left < containerRect.left + DRAG_EDGE_SCROLL_ZONE_PX
    ) {
      scrollLeft = -Math.min(
        DRAG_EDGE_SCROLL_MAX_STEP_PX,
        ((containerRect.left + DRAG_EDGE_SCROLL_ZONE_PX) - translatedRect.left) /
          5,
      );
    }

    if (scrollLeft !== 0) {
      container.scrollBy({
        left: scrollLeft,
        behavior: "auto",
      });
    }

    syncPreviewIndexFromActiveRect(translatedRect);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.active.id !== TIMELINE_PREVIEW_ITEM_ID) {
      setIsDraggingPreviewCard(false);
      return;
    }

    const slotIndex = orderedItemIds.indexOf(TIMELINE_PREVIEW_ITEM_ID);

    if (slotIndex !== -1) {
      onSelectSlot(slotIndex);
    }

    setIsDraggingPreviewCard(false);
  }

  function handleDragCancel() {
    lastPreviewReorderAtRef.current = 0;
    setIsDraggingPreviewCard(false);
  }

  return {
    isDraggingPreviewCard,
    orderedItemIds,
    previewItemId: TIMELINE_PREVIEW_ITEM_ID,
    timelineItemMap,
    handleDragCancel,
    handleDragEnd,
    handleDragMove,
    handleDragStart,
  };
}
