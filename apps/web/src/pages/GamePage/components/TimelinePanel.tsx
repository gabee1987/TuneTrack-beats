import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import type { TimelinePanelProps } from "../GamePage.types";
import { DRAG_ACTIVATION_DISTANCE_PX } from "../gamePage.constants";
import { useTimelinePanelCelebrationState } from "../hooks/useTimelinePanelCelebrationState";
import { useTimelinePanelDragState } from "../hooks/useTimelinePanelDragState";
import { useTimelineOverflowState } from "../hooks/useTimelineOverflowState";
import { TimelineCelebration } from "./TimelineCelebration";
import { PreviewCard } from "./PreviewCard";
import { TimelineSortableItem } from "./TimelineSortableItem";
import styles from "./TimelinePanel.module.css";

export function TimelinePanel({
  title,
  hint,
  showHint,
  celebrationCard,
  celebrationKey,
  celebrationMessage,
  cardCount,
  canChangeTimelineView = true,
  canToggleView = false,
  timelineView = "active",
  timelineCards,
  onToggleTimelineView,
  previewCard,
  previewSlotIndex,
  selectable,
  selectedSlotIndex,
  onSelectSlot,
  originalChosenSlotIndex,
  challengerChosenSlotIndex,
  challengeMarkerTone = "pending",
  disabledSlotIndexes = [],
  hiddenCardMode,
  showDevCardInfo,
  showDevYearInfo,
  showDevAlbumInfo,
  showDevGenreInfo,
  showCorrectionPreview = false,
  showCorrectPlacementPreview = false,
  theme,
}: TimelinePanelProps) {
  const timelineRowRef = useRef<HTMLDivElement | null>(null);
  const previewCardElementRef = useRef<HTMLElement | null>(null);
  const {
    flyAnimationState,
    mineButtonRef,
    previewCardRectRef,
    showCelebrationToast,
  } = useTimelinePanelCelebrationState({
    celebrationCard,
    celebrationKey,
    timelineView,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE_PX,
      },
    }),
  );
  const {
    handleDragCancel,
    handleDragEnd,
    handleDragMove,
    handleDragStart,
    isDraggingPreviewCard,
    orderedItemIds,
    timelineItemMap,
  } = useTimelinePanelDragState({
    onSelectSlot,
    previewCard,
    previewSlotIndex,
    selectedSlotIndex,
    timelineCards,
    timelineRowRef,
  });
  const hasTimelineOverflow = useTimelineOverflowState({
    dependencyKey: orderedItemIds,
    timelineRowRef,
  });

  useLayoutEffect(() => {
    if (!previewCardElementRef.current) {
      return;
    }

    previewCardRectRef.current =
      previewCardElementRef.current.getBoundingClientRect();
  }, [orderedItemIds, previewCard, previewSlotIndex, timelineView]);

  return (
    <section className={styles.timelinePanel}>
      <div className={styles.timelineHeader}>
        <div className={styles.timelineHeaderCopy}>
          <h2 className={styles.timelineHeading}>{title}</h2>
          <span className={styles.timelineCountSeparator}>/</span>
          <span className={styles.timelineCount}>
            {cardCount} card{cardCount === 1 ? "" : "s"}
          </span>
        </div>
        {canToggleView && onToggleTimelineView ? (
          <div className={styles.timelineViewSwitcherCompact}>
            <button
              className={`${styles.timelineViewCompactButton} ${
                timelineView === "active"
                  ? styles.timelineViewCompactButtonActive
                  : ""
              }`}
              data-active={timelineView === "active"}
              disabled={!canChangeTimelineView}
              onClick={() => onToggleTimelineView("active")}
              type="button"
            >
              Active
            </button>
            <button
              className={`${styles.timelineViewCompactButton} ${
                timelineView === "mine"
                  ? styles.timelineViewCompactButtonActive
                  : ""
              }`}
              data-active={timelineView === "mine"}
              disabled={!canChangeTimelineView}
              onClick={() => onToggleTimelineView("mine")}
              ref={mineButtonRef}
              type="button"
            >
              Mine
            </button>
          </div>
        ) : null}
      </div>
      {showHint ? <p className={styles.timelineHint}>{hint}</p> : null}
      <AnimatePresence>
        {showCelebrationToast && celebrationMessage ? (
          <TimelineCelebration key={celebrationKey ?? celebrationMessage} message={celebrationMessage} />
        ) : null}
      </AnimatePresence>
      <DndContext
        autoScroll
        collisionDetection={closestCenter}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div
          className={`${styles.timelineRow} ${
            hasTimelineOverflow ? styles.timelineRowOverflowing : ""
          }`}
          ref={timelineRowRef}
        >
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
                  showDevYearInfo={showDevYearInfo}
                  showDevGenreInfo={showDevGenreInfo}
                  theme={theme}
                  {...(item.type === "preview"
                    ? {
                        previewCardRef: (node: HTMLElement | null) => {
                          previewCardElementRef.current = node;
                        },
                      }
                    : {})}
                />
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={null}>
          {isDraggingPreviewCard && previewCard ? (
            <PreviewCard
              hiddenCardMode={hiddenCardMode}
              isChallengeSlot={false}
              isGhosted={false}
              isOriginalSlot={false}
              isOverlay={true}
              previewCard={previewCard}
              selectable={false}
              showDevAlbumInfo={showDevAlbumInfo}
              showDevCardInfo={showDevCardInfo}
              showDevYearInfo={showDevYearInfo}
              showDevGenreInfo={showDevGenreInfo}
              showRevealedContent={showCorrectionPreview}
              theme={theme}
              tone="pending"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      {typeof document !== "undefined" && flyAnimationState
        ? createPortal(
            <motion.div
              animate={{
                opacity: 0,
                scale: 0.2,
                x:
                  flyAnimationState.targetRect.left +
                  flyAnimationState.targetRect.width / 2 -
                  (flyAnimationState.sourceRect.left +
                    flyAnimationState.sourceRect.width / 2),
                y:
                  flyAnimationState.targetRect.top +
                  flyAnimationState.targetRect.height / 2 -
                  (flyAnimationState.sourceRect.top +
                    flyAnimationState.sourceRect.height / 2),
              }}
              className={styles.flyToMineCard}
              initial={{
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
              }}
              style={{
                height: flyAnimationState.sourceRect.height,
                left: flyAnimationState.sourceRect.left,
                top: flyAnimationState.sourceRect.top,
                width: flyAnimationState.sourceRect.width,
              }}
              transition={{
                duration: 0.82,
                ease: [0.18, 0.84, 0.24, 1],
              }}
            >
              <PreviewCard
                hiddenCardMode="gradient"
                isChallengeSlot={false}
                isGhosted={false}
                isOriginalSlot={false}
                previewCard={flyAnimationState.card}
                selectable={false}
                showDevAlbumInfo={showDevAlbumInfo}
                showDevCardInfo={true}
                showDevYearInfo={true}
                showDevGenreInfo={showDevGenreInfo}
                showRevealedContent={true}
                theme={theme}
                tone="success"
              />
            </motion.div>,
            document.body,
          )
        : null}
    </section>
  );
}
