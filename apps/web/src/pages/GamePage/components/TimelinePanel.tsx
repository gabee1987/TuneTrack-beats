import { AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  useLayoutEffect,
  useRef,
} from "react";
import type { TimelinePanelProps } from "../GamePage.types";
import { DRAG_ACTIVATION_DISTANCE_PX } from "../gamePage.constants";
import { useTimelinePanelCelebrationState } from "../hooks/useTimelinePanelCelebrationState";
import { useTimelinePanelDragState } from "../hooks/useTimelinePanelDragState";
import { useTimelineOverflowState } from "../hooks/useTimelineOverflowState";
import { TimelineCelebration } from "./TimelineCelebration";
import { TimelinePanelFlyAnimation } from "./TimelinePanelFlyAnimation";
import { TimelinePanelHeader } from "./TimelinePanelHeader";
import { TimelinePanelItems } from "./TimelinePanelItems";
import { PreviewCard } from "./PreviewCard";
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
      <TimelinePanelHeader
        canChangeTimelineView={canChangeTimelineView}
        canToggleView={canToggleView}
        cardCount={cardCount}
        onMineButtonRef={(node) => {
          mineButtonRef.current = node;
        }}
        onToggleTimelineView={onToggleTimelineView}
        timelineView={timelineView}
        title={title}
      />
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
          <TimelinePanelItems
            challengeMarkerTone={challengeMarkerTone}
            challengerChosenSlotIndex={challengerChosenSlotIndex}
            disabledSlotIndexes={disabledSlotIndexes}
            hiddenCardMode={hiddenCardMode}
            isDraggingPreviewCard={isDraggingPreviewCard}
            orderedItemIds={orderedItemIds}
            originalChosenSlotIndex={originalChosenSlotIndex}
            onPreviewCardRef={(node) => {
              previewCardElementRef.current = node;
            }}
            selectable={selectable}
            showCorrectPlacementPreview={showCorrectPlacementPreview}
            showCorrectionPreview={showCorrectionPreview}
            showDevAlbumInfo={showDevAlbumInfo}
            showDevCardInfo={showDevCardInfo}
            showDevGenreInfo={showDevGenreInfo}
            showDevYearInfo={showDevYearInfo}
            theme={theme}
            timelineItemMap={timelineItemMap}
          />
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
      <TimelinePanelFlyAnimation
        flyAnimationState={flyAnimationState}
        showDevAlbumInfo={showDevAlbumInfo}
        showDevGenreInfo={showDevGenreInfo}
        theme={theme}
      />
    </section>
  );
}
