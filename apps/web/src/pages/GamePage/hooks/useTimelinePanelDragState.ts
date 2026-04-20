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

function isGridTimelineLayout(container: HTMLElement): boolean {
  return getComputedStyle(container).display === "grid";
}

function getGridPreviewIndex(
  activeCenterX: number,
  activeCenterY: number,
  timelineCards: HTMLElement[],
): number {
  let nextPreviewIndex = 0;

  for (const timelineCard of timelineCards) {
    const cardRect = timelineCard.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    const sameRowTop = cardRect.top;
    const sameRowBottom = cardRect.bottom;

    if (activeCenterY > sameRowBottom) {
      nextPreviewIndex += 1;
      continue;
    }

    if (activeCenterY >= sameRowTop && activeCenterY <= sameRowBottom) {
      if (activeCenterX > cardCenterX) {
        nextPreviewIndex += 1;
        continue;
      }

      break;
    }

    if (activeCenterY < cardCenterY) {
      break;
    }
  }

  return nextPreviewIndex;
}

function getHorizontalPreviewIndex(
  activeCenterX: number,
  timelineCards: HTMLElement[],
): number {
  let nextPreviewIndex = 0;

  for (const timelineCard of timelineCards) {
    const cardRect = timelineCard.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;

    if (activeCenterX > cardCenterX) {
      nextPreviewIndex += 1;
    } else {
      break;
    }
  }

  return nextPreviewIndex;
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
    const activeCenterY = translatedRect.top + translatedRect.height / 2;
    const renderedTimelineCards = Array.from(
      timelineRow.querySelectorAll<HTMLElement>("[data-timeline-card='true']"),
    );
    const nextPreviewIndex = isGridTimelineLayout(timelineRow)
      ? getGridPreviewIndex(activeCenterX, activeCenterY, renderedTimelineCards)
      : getHorizontalPreviewIndex(activeCenterX, renderedTimelineCards);

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
    let scrollTop = 0;

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

    if (isGridTimelineLayout(container)) {
      if (translatedRect.bottom > containerRect.bottom - DRAG_EDGE_SCROLL_ZONE_PX) {
        scrollTop = Math.min(
          DRAG_EDGE_SCROLL_MAX_STEP_PX,
          (translatedRect.bottom - (containerRect.bottom - DRAG_EDGE_SCROLL_ZONE_PX)) /
            5,
        );
      } else if (
        translatedRect.top < containerRect.top + DRAG_EDGE_SCROLL_ZONE_PX
      ) {
        scrollTop = -Math.min(
          DRAG_EDGE_SCROLL_MAX_STEP_PX,
          ((containerRect.top + DRAG_EDGE_SCROLL_ZONE_PX) - translatedRect.top) /
            5,
        );
      }

      if (scrollTop !== 0) {
        container.scrollBy({
          top: scrollTop,
          behavior: "auto",
        });
      }
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
