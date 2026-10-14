import { type DragEndEvent, type DragMoveEvent, type DragStartEvent } from "@dnd-kit/core";
import type { TimelineCardPublic } from "@tunetrack/shared/client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TIMELINE_REORDER_THROTTLE_MS } from "../gamePage.constants";
import type { GamePageCard } from "../GamePage.types";
import {
  TIMELINE_PREVIEW_ITEM_ID,
  buildBaseOrderedTimelineItemIds,
  buildOrderedTimelineItemIdsForPreviewIndex,
  buildTimelineItemMap,
  clampPreviewIndex,
} from "../gamePageTimelineItems";
import {
  applyAncestorScroll,
  applyContainerScroll,
  getPreviewIndexForActiveRect,
  measureTimelineDragGeometry,
  type TimelineDragGeometry,
} from "./timelineDragGeometry";
import { glideTimelineReorder } from "./timelineReorderGlide";

interface UseTimelinePanelDragStateOptions {
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  reduceMotion: boolean;
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
  reduceMotion,
  selectedSlotIndex,
  timelineCards,
  timelineRowRef,
  onSelectSlot,
}: UseTimelinePanelDragStateOptions): UseTimelinePanelDragStateResult {
  const [isDraggingPreviewCard, setIsDraggingPreviewCard] = useState(false);
  const lastPreviewReorderAtRef = useRef(0);
  const dragGeometryRef = useRef<TimelineDragGeometry | null>(null);
  const stopTrackingScrollRef = useRef<(() => void) | null>(null);
  const pendingGlideRef = useRef<{
    geometry: TimelineDragGeometry;
    previousOrder: string[];
  } | null>(null);

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
  // Drag events read the order through this ref so a move never compares against the order
  // of an earlier render.
  const orderedItemIdsRef = useRef(orderedItemIds);

  function applyOrderedItemIds(
    nextOrder: string[],
    geometry: TimelineDragGeometry | null = dragGeometryRef.current,
  ) {
    if (geometry) {
      pendingGlideRef.current = {
        geometry,
        previousOrder: pendingGlideRef.current?.previousOrder ?? orderedItemIdsRef.current,
      };
    }
    orderedItemIdsRef.current = nextOrder;
    setOrderedItemIds(nextOrder);
  }

  // A drag reorder glides the cards itself; dnd-kit's displacement is switched off (see
  // `TimelinePanelItems`), because the two fought and made neighbouring cards snap.
  useLayoutEffect(() => {
    const pendingGlide = pendingGlideRef.current;
    pendingGlideRef.current = null;
    const container = timelineRowRef.current;

    if (pendingGlide && container && !reduceMotion) {
      glideTimelineReorder(
        container,
        pendingGlide.previousOrder,
        orderedItemIds,
        pendingGlide.geometry,
      );
    }
  }, [orderedItemIds, reduceMotion, timelineRowRef]);

  useEffect(() => {
    if (!isDraggingPreviewCard) {
      orderedItemIdsRef.current = baseOrderedItemIds;
      setOrderedItemIds(baseOrderedItemIds);
    }
  }, [baseOrderedItemIds, isDraggingPreviewCard]);

  useEffect(() => () => stopTrackingScrollRef.current?.(), []);

  const timelineItemMap = useMemo(
    () => buildTimelineItemMap(timelineCards, previewCard),
    [previewCard, timelineCards],
  );

  function startTrackingScroll(container: HTMLElement) {
    function handleScroll(event: Event) {
      const geometry = dragGeometryRef.current;
      if (!geometry) {
        return;
      }

      if (event.target === container) {
        dragGeometryRef.current = applyContainerScroll(geometry, container);
      } else if (event.target instanceof Node && event.target.contains(container)) {
        dragGeometryRef.current = applyAncestorScroll(geometry, container);
      }
    }

    document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    stopTrackingScrollRef.current = () => {
      document.removeEventListener("scroll", handleScroll, { capture: true });
      stopTrackingScrollRef.current = null;
    };
  }

  function stopDragTracking() {
    stopTrackingScrollRef.current?.();
    dragGeometryRef.current = null;
    lastPreviewReorderAtRef.current = 0;
  }

  function syncPreviewIndexFromActiveRect(
    geometry: TimelineDragGeometry,
    translatedRect: NonNullable<DragMoveEvent["active"]["rect"]["current"]["translated"]>,
  ) {
    const currentPreviewIndex = orderedItemIdsRef.current.indexOf(TIMELINE_PREVIEW_ITEM_ID);
    const nextPreviewIndex = getPreviewIndexForActiveRect(
      geometry,
      translatedRect,
      currentPreviewIndex,
    );

    if (currentPreviewIndex === nextPreviewIndex) {
      return;
    }

    const now = performance.now();

    if (now - lastPreviewReorderAtRef.current < TIMELINE_REORDER_THROTTLE_MS) {
      return;
    }

    lastPreviewReorderAtRef.current = now;
    applyOrderedItemIds(
      buildOrderedTimelineItemIdsForPreviewIndex(timelineCards, nextPreviewIndex),
    );
    onSelectSlot(nextPreviewIndex);
  }

  function handleDragStart(_: DragStartEvent) {
    stopDragTracking();
    const container = timelineRowRef.current;

    if (container) {
      dragGeometryRef.current = measureTimelineDragGeometry(container);
      startTrackingScroll(container);
    }

    setIsDraggingPreviewCard(true);
  }

  // Edge scrolling belongs to `useTimelineEdgeAutoScroll`; a per-event scroll here would
  // speed up with the pointer event rate.
  function handleDragMove(event: DragMoveEvent) {
    const geometry = dragGeometryRef.current;
    const translatedRect = event.active.rect.current.translated;

    if (geometry && translatedRect) {
      syncPreviewIndexFromActiveRect(geometry, translatedRect);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const geometry = dragGeometryRef.current;
    const translatedRect = event.active.rect.current.translated;
    stopDragTracking();

    if (event.active.id !== TIMELINE_PREVIEW_ITEM_ID) {
      setIsDraggingPreviewCard(false);
      return;
    }

    // The release position decides, even when the last crossing fell inside the reorder
    // throttle and no move event followed it.
    if (geometry && translatedRect) {
      const currentPreviewIndex = orderedItemIdsRef.current.indexOf(TIMELINE_PREVIEW_ITEM_ID);
      const releasePreviewIndex = getPreviewIndexForActiveRect(
        geometry,
        translatedRect,
        currentPreviewIndex,
      );

      if (releasePreviewIndex !== currentPreviewIndex) {
        applyOrderedItemIds(
          buildOrderedTimelineItemIdsForPreviewIndex(timelineCards, releasePreviewIndex),
          geometry,
        );
      }
    }

    const slotIndex = orderedItemIdsRef.current.indexOf(TIMELINE_PREVIEW_ITEM_ID);

    if (slotIndex !== -1) {
      onSelectSlot(slotIndex);
    }

    setIsDraggingPreviewCard(false);
  }

  function handleDragCancel() {
    stopDragTracking();
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
