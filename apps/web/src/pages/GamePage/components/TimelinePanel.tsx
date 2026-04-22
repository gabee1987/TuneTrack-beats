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
import type {
  TimelinePanelDragModel,
  TimelinePanelItemsModel,
  TimelinePanelModel,
} from "../GamePage.types";
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

interface TimelinePanelProps {
  model: TimelinePanelModel;
}

export function TimelinePanel({ model }: TimelinePanelProps) {
  const timelineView = model.render.timelineView ?? "active";
  const dragModel: TimelinePanelDragModel = {
    onSelectSlot: model.interaction.onSelectSlot,
    previewCard: model.interaction.previewCard,
    previewSlotIndex: model.interaction.previewSlotIndex,
    selectedSlotIndex: model.interaction.selectedSlotIndex,
    timelineCards: model.render.timelineCards,
  };
  const itemsModel: TimelinePanelItemsModel = {
    challengeMarkerTone: model.interaction.challengeMarkerTone ?? "pending",
    challengerChosenSlotIndex: model.interaction.challengerChosenSlotIndex,
    disabledSlotIndexes: model.interaction.disabledSlotIndexes ?? [],
    hiddenCardMode: model.render.hiddenCardMode,
    isPreviewCardReplacing: model.render.isPreviewCardReplacing,
    originalChosenSlotIndex: model.interaction.originalChosenSlotIndex,
    previewCardSwapKey: model.render.previewCardSwapKey,
    selectable: model.interaction.selectable,
    showCorrectPlacementPreview: model.render.showCorrectPlacementPreview ?? false,
    showCorrectionPreview: model.render.showCorrectionPreview ?? false,
    showDevAlbumInfo: model.render.showDevAlbumInfo,
    showDevCardInfo: model.render.showDevCardInfo,
    showDevGenreInfo: model.render.showDevGenreInfo,
    showDevYearInfo: model.render.showDevYearInfo,
    theme: model.render.theme,
  };
  const previewCard = dragModel.previewCard;
  const previewSlotIndex = dragModel.previewSlotIndex;

  const timelineRowRef = useRef<HTMLDivElement | null>(null);
  const previewCardElementRef = useRef<HTMLElement | null>(null);
  const {
    flyAnimationState,
    mineButtonRef,
    previewCardRectRef,
    showCelebrationToast,
  } = useTimelinePanelCelebrationState({
    celebrationCard: model.render.celebrationCard,
    celebrationKey: model.render.celebrationKey,
    shouldAnimateCelebrationCardToMine:
      model.render.shouldAnimateCelebrationCardToMine,
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
    onSelectSlot: dragModel.onSelectSlot,
    previewCard: dragModel.previewCard,
    previewSlotIndex: dragModel.previewSlotIndex,
    selectedSlotIndex: dragModel.selectedSlotIndex,
    timelineCards: dragModel.timelineCards,
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
        model={model.header}
        onMineButtonRef={(node) => {
          mineButtonRef.current = node;
        }}
      />
      {model.render.showHint ? (
        <p className={styles.timelineHint}>{model.render.hint}</p>
      ) : null}
      <AnimatePresence>
        {showCelebrationToast && model.render.celebrationMessage ? (
          <TimelineCelebration
            key={model.render.celebrationKey ?? model.render.celebrationMessage}
            message={model.render.celebrationMessage}
            tone={model.render.celebrationTone ?? "success"}
          />
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
            isDraggingPreviewCard={isDraggingPreviewCard}
            model={itemsModel}
            orderedItemIds={orderedItemIds}
            onPreviewCardRef={(node) => {
              previewCardElementRef.current = node;
            }}
            timelineItemMap={timelineItemMap}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {isDraggingPreviewCard && previewCard ? (
            <PreviewCard
              hiddenCardMode={model.render.hiddenCardMode}
              isChallengeSlot={false}
              isGhosted={false}
              isOriginalSlot={false}
              isOverlay={true}
              previewCard={previewCard}
              selectable={false}
              showDevAlbumInfo={model.render.showDevAlbumInfo}
              showDevCardInfo={model.render.showDevCardInfo}
              showDevYearInfo={model.render.showDevYearInfo}
              showDevGenreInfo={model.render.showDevGenreInfo}
              showRevealedContent={model.render.showCorrectionPreview ?? false}
              theme={model.render.theme}
              tone="pending"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <TimelinePanelFlyAnimation
        flyAnimationState={flyAnimationState}
        showDevAlbumInfo={model.render.showDevAlbumInfo}
        showDevGenreInfo={model.render.showDevGenreInfo}
        theme={model.render.theme}
      />
    </section>
  );
}
