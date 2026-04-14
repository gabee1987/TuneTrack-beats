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

const PREVIEW_ITEM_ID = "timeline-preview-card";

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

  const previewIndex = previewCard
    ? Math.max(
        0,
        Math.min(previewSlotIndex ?? selectedSlotIndex, timelineCards.length),
      )
    : null;

  const baseOrderedItemIds = useMemo(() => {
    const itemIds = timelineCards.map(
      (card, index) => `timeline-card-${card.id}-${index}`,
    );

    if (previewCard && previewIndex !== null) {
      itemIds.splice(previewIndex, 0, PREVIEW_ITEM_ID);
    }

    return itemIds;
  }, [previewCard, previewIndex, timelineCards]);

  const [orderedItemIds, setOrderedItemIds] = useState<string[]>(baseOrderedItemIds);

  useEffect(() => {
    if (!isDraggingPreviewCard) {
      setOrderedItemIds(baseOrderedItemIds);
    }
  }, [baseOrderedItemIds, isDraggingPreviewCard]);

  const timelineItemMap = useMemo(() => {
    const map = new Map<
      string,
        | {
          type: "preview";
          card: GamePageCard;
        }
      | {
          type: "timeline";
          card: TimelineCardPublic;
        }
    >();

    timelineCards.forEach((card, index) => {
      map.set(`timeline-card-${card.id}-${index}`, {
        type: "timeline",
        card,
      });
    });

    if (previewCard) {
      map.set(PREVIEW_ITEM_ID, {
        type: "preview",
        card: previewCard,
      });
    }

    return map;
  }, [previewCard, timelineCards]);

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

    if (orderedItemIds.indexOf(PREVIEW_ITEM_ID) === nextPreviewIndex) {
      return;
    }

    const now = performance.now();

    if (now - lastPreviewReorderAtRef.current < TIMELINE_REORDER_THROTTLE_MS) {
      return;
    }

    const nextOrder = timelineCards.map(
      (card, index) => `timeline-card-${card.id}-${index}`,
    );

    nextOrder.splice(nextPreviewIndex, 0, PREVIEW_ITEM_ID);

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
    if (event.active.id !== PREVIEW_ITEM_ID) {
      setIsDraggingPreviewCard(false);
      return;
    }

    const slotIndex = orderedItemIds.indexOf(PREVIEW_ITEM_ID);

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
    previewItemId: PREVIEW_ITEM_ID,
    timelineItemMap,
    handleDragCancel,
    handleDragEnd,
    handleDragMove,
    handleDragStart,
  };
}
