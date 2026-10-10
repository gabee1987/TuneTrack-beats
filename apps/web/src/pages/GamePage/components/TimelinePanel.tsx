import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MotionPresence } from "../../../features/motion";
import { usePageLayoutMode } from "../../../hooks/usePageLayoutMode";
import type {
  GamePageCard,
  TimelinePanelDragModel,
  TimelinePanelItemsModel,
  TimelinePanelModel,
} from "../GamePage.types";
import { SongInfoModal } from "./SongInfoModal";
import { DRAG_ACTIVATION_DISTANCE_PX, TIMELINE_AUTO_SCROLL } from "../gamePage.constants";
import { useTimelinePreviewTransition } from "../hooks/transitions/useTimelinePreviewTransition";
import { useCorrectPlacementAnimationKey } from "../hooks/useCorrectPlacementAnimationKey";
import { useDragOverlaySize } from "../hooks/useDragOverlaySize";
import { useTimelinePanelCelebrationState } from "../hooks/useTimelinePanelCelebrationState";
import { useTimelinePanelDragState } from "../hooks/useTimelinePanelDragState";
import { useTimelineOverflowState } from "../hooks/useTimelineOverflowState";
import { TimelineCelebration } from "./TimelineCelebration";
import { TimelinePanelFlyAnimation } from "./TimelinePanelFlyAnimation";
import { TimelinePanelHeader } from "./TimelinePanelHeader";
import { TimelinePanelHints } from "./TimelinePanelHints";
import { TimelinePanelItems } from "./TimelinePanelItems";
import { PreviewCard } from "./PreviewCard";
import styles from "./timelinePanelShell.module.css";

const NO_DISABLED_SLOT_INDEXES: number[] = [];

interface TimelinePanelProps {
  model: TimelinePanelModel;
}

export function TimelinePanel({ model }: TimelinePanelProps) {
  const layoutMode = usePageLayoutMode();
  const timelineView = model.render.timelineView ?? "active";
  const {
    displayPreviewCard,
    displayPreviewSlot,
    displayShowCorrectPlacementPreview,
    displayShowCorrectionPreview,
    displayShowRevealedContent,
  } = useTimelinePreviewTransition({
    previewCard: model.interaction.previewCard,
    previewSlot: model.interaction.previewSlotIndex,
    showCorrectPlacementPreview: model.render.showCorrectPlacementPreview ?? false,
    showCorrectionPreview: model.render.showCorrectionPreview ?? false,
    transitionEvent: model.render.timelinePreviewTransitionEvent,
  });
  const dragModel = useMemo<TimelinePanelDragModel>(
    () => ({
      onSelectSlot: model.interaction.onSelectSlot,
      previewCard: displayPreviewCard,
      previewSlotIndex: displayPreviewSlot,
      selectedSlotIndex: model.interaction.selectedSlotIndex,
      timelineCards: model.render.timelineCards,
    }),
    [
      displayPreviewCard,
      displayPreviewSlot,
      model.interaction.onSelectSlot,
      model.interaction.selectedSlotIndex,
      model.render.timelineCards,
    ],
  );
  const previewCard = dragModel.previewCard;
  const previewSlotIndex = dragModel.previewSlotIndex;

  const [cardForInfo, setCardForInfo] = useState<GamePageCard | null>(null);
  const [timelineCardHintAnchor, setTimelineCardHintAnchor] = useState<HTMLElement | null>(null);
  const [previewHintAnchor, setPreviewHintAnchor] = useState<HTMLElement | null>(null);
  const [timelineSwitchHintAnchor, setTimelineSwitchHintAnchor] = useState<HTMLElement | null>(
    null,
  );
  const timelineRowRef = useRef<HTMLDivElement | null>(null);
  const previewCardElementRef = useRef<HTMLElement | null>(null);
  const { captureDragOverlaySize, clearDragOverlaySize, dragOverlayStyle } =
    useDragOverlaySize(previewCardElementRef);
  const shouldAnimateCorrectPlacement = useCorrectPlacementAnimationKey({
    isShowingCorrectPlacement: displayShowCorrectPlacementPreview,
    originalChosenSlotIndex: model.interaction.originalChosenSlotIndex,
    timelineCards: model.render.timelineCards,
  });
  const itemsModel = useMemo<TimelinePanelItemsModel>(
    () => ({
      challengeMarkerTone: model.interaction.challengeMarkerTone ?? "pending",
      challengerChosenSlotIndex: model.interaction.challengerChosenSlotIndex,
      disabledSlotIndexes: model.interaction.disabledSlotIndexes ?? NO_DISABLED_SLOT_INDEXES,
      hiddenCardMode: model.render.hiddenCardMode,
      revealedCardMode: model.render.revealedCardMode,
      originalChosenSlotIndex: model.interaction.originalChosenSlotIndex,
      previewCardTransitionEvent: model.render.previewCardTransitionEvent,
      selectable: model.interaction.selectable,
      shouldAnimateCorrectPlacement,
      showCorrectPlacementPreview: displayShowCorrectPlacementPreview,
      showCorrectionPreview: displayShowCorrectionPreview,
      showDevAlbumInfo: model.render.showDevAlbumInfo,
      showDevCardInfo: model.render.showDevCardInfo,
      showDevGenreInfo: model.render.showDevGenreInfo,
      showDevYearInfo: model.render.showDevYearInfo,
      theme: model.render.theme,
    }),
    [
      displayShowCorrectPlacementPreview,
      displayShowCorrectionPreview,
      model.interaction.challengeMarkerTone,
      model.interaction.challengerChosenSlotIndex,
      model.interaction.disabledSlotIndexes,
      model.interaction.originalChosenSlotIndex,
      model.interaction.selectable,
      model.render.hiddenCardMode,
      model.render.previewCardTransitionEvent,
      model.render.revealedCardMode,
      model.render.showDevAlbumInfo,
      model.render.showDevCardInfo,
      model.render.showDevGenreInfo,
      model.render.showDevYearInfo,
      model.render.theme,
      shouldAnimateCorrectPlacement,
    ],
  );
  const { activeCelebrationEvent, flyAnimationState, mineButtonRef, previewCardRectRef } =
    useTimelinePanelCelebrationState({
      timelineView,
      transitionEvent: model.render.timelineCelebrationTransitionEvent,
    });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE_PX,
      },
    }),
  );

  const {
    handleDragCancel: completeDragCancel,
    handleDragEnd: completeDragEnd,
    handleDragMove,
    handleDragStart: completeDragStart,
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
    itemCount: orderedItemIds.length,
    timelineRowRef,
  });
  const handleMineButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      mineButtonRef.current = node;
      setTimelineSwitchHintAnchor(node);
    },
    [mineButtonRef],
  );
  const handlePreviewCardRef = useCallback((node: HTMLElement | null) => {
    previewCardElementRef.current = node;
    setPreviewHintAnchor(node);
  }, []);

  function handleDragStart(...args: Parameters<typeof completeDragStart>) {
    captureDragOverlaySize();
    completeDragStart(...args);
  }

  function handleDragEnd(...args: Parameters<typeof completeDragEnd>) {
    completeDragEnd(...args);
    clearDragOverlaySize();
  }

  function handleDragCancel(...args: Parameters<typeof completeDragCancel>) {
    completeDragCancel(...args);
    clearDragOverlaySize();
  }

  // Not measured mid-drag: every reorder would force a layout read; the drop re-measures.
  useLayoutEffect(() => {
    if (!previewCardElementRef.current || isDraggingPreviewCard) {
      return;
    }

    previewCardRectRef.current = previewCardElementRef.current.getBoundingClientRect();
  }, [isDraggingPreviewCard, orderedItemIds, previewCard, previewSlotIndex, timelineView]);

  return (
    <section
      className={`${styles.timelinePanel}${
        layoutMode === "desktop" ? ` ${styles.timelinePanelDesktop}` : ""
      }`}
    >
      <TimelinePanelHeader model={model.header} onMineButtonRef={handleMineButtonRef} />
      {model.render.showHint ? <p className={styles.timelineHint}>{model.render.hint}</p> : null}
      <MotionPresence mode="sync">
        {activeCelebrationEvent ? (
          <TimelineCelebration
            key={activeCelebrationEvent.eventKey}
            message={activeCelebrationEvent.message}
            tone={activeCelebrationEvent.tone}
          />
        ) : null}
      </MotionPresence>
      <DndContext
        autoScroll={TIMELINE_AUTO_SCROLL}
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
          } ${isDraggingPreviewCard ? styles.timelineRowDragging : ""}`}
          ref={timelineRowRef}
        >
          <TimelinePanelItems
            hintAnchorRef={setTimelineCardHintAnchor}
            isDraggingPreviewCard={isDraggingPreviewCard}
            model={itemsModel}
            onCardInfoRequest={setCardForInfo}
            orderedItemIds={orderedItemIds}
            onPreviewCardRef={handlePreviewCardRef}
            timelineItemMap={timelineItemMap}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {isDraggingPreviewCard && previewCard ? (
            <div className={styles.dragOverlayWrap} style={dragOverlayStyle}>
              <div aria-hidden="true" className={styles.dragOverlayBlur} />
              <PreviewCard
                hiddenCardMode={model.render.hiddenCardMode}
                revealedCardMode={model.render.revealedCardMode}
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
                showRevealedContent={displayShowRevealedContent}
                theme={model.render.theme}
                tone="pending"
                transitionEvent={null}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <TimelinePanelHints
        canToggleView={Boolean(model.header.canToggleView)}
        hasPreviewCard={previewCard !== null}
        isOwnTimeline={model.render.isOwnTimeline}
        isSelectable={model.interaction.selectable}
        previewAnchor={previewHintAnchor}
        timelineCardAnchor={timelineCardHintAnchor}
        timelineCardCount={model.render.timelineCards.length}
        timelineSwitchAnchor={timelineSwitchHintAnchor}
      />
      <TimelinePanelFlyAnimation
        flyAnimationState={flyAnimationState}
        showDevAlbumInfo={model.render.showDevAlbumInfo}
        showDevGenreInfo={model.render.showDevGenreInfo}
        theme={model.render.theme}
      />
      <SongInfoModal card={cardForInfo} onClose={() => setCardForInfo(null)} />
    </section>
  );
}
