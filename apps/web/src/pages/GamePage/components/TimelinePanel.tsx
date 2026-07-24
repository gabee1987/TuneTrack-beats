import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  MotionPresence,
  timelineCelebrationTransitionContract,
} from "../../../features/motion";
import { usePageLayoutMode } from "../../../hooks/usePageLayoutMode";
import type {
  GamePageCard,
  TimelinePanelDragModel,
  TimelinePanelItemsModel,
  TimelinePanelModel,
} from "../GamePage.types";
import { SongInfoModal } from "./SongInfoModal";
import { DRAG_ACTIVATION_DISTANCE_PX } from "../gamePage.constants";
import { useTimelinePreviewTransition } from "../hooks/transitions/useTimelinePreviewTransition";
import { useTimelinePanelCelebrationState } from "../hooks/useTimelinePanelCelebrationState";
import { useTimelinePanelDragState } from "../hooks/useTimelinePanelDragState";
import { useTimelineOverflowState } from "../hooks/useTimelineOverflowState";
import { TimelineCelebration } from "./TimelineCelebration";
import { TimelinePanelFlyAnimation } from "./TimelinePanelFlyAnimation";
import { TimelinePanelHeader } from "./TimelinePanelHeader";
import { TimelinePanelItems } from "./TimelinePanelItems";
import { PreviewCard } from "./PreviewCard";
import styles from "./timelineStyles";

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
  const dragModel: TimelinePanelDragModel = {
    onSelectSlot: model.interaction.onSelectSlot,
    previewCard: displayPreviewCard,
    previewSlotIndex: displayPreviewSlot,
    selectedSlotIndex: model.interaction.selectedSlotIndex,
    timelineCards: model.render.timelineCards,
  };
  const itemsModel: TimelinePanelItemsModel = {
    challengeMarkerTone: model.interaction.challengeMarkerTone ?? "pending",
    challengerChosenSlotIndex: model.interaction.challengerChosenSlotIndex,
    disabledSlotIndexes: model.interaction.disabledSlotIndexes ?? [],
    hiddenCardMode: model.render.hiddenCardMode,
    revealedCardMode: model.render.revealedCardMode,
    originalChosenSlotIndex: model.interaction.originalChosenSlotIndex,
    previewCardTransitionEvent: model.render.previewCardTransitionEvent,
    selectable: model.interaction.selectable,
    shouldAnimateCorrectPlacement: false,
    showCorrectPlacementPreview: displayShowCorrectPlacementPreview,
    showCorrectionPreview: displayShowCorrectionPreview,
    showDevAlbumInfo: model.render.showDevAlbumInfo,
    showDevCardInfo: model.render.showDevCardInfo,
    showDevGenreInfo: model.render.showDevGenreInfo,
    showDevYearInfo: model.render.showDevYearInfo,
    theme: model.render.theme,
  };
  const previewCard = dragModel.previewCard;
  const previewSlotIndex = dragModel.previewSlotIndex;

  const [cardForInfo, setCardForInfo] = useState<GamePageCard | null>(null);
  const [dragOverlaySize, setDragOverlaySize] = useState<{
    height: number;
    width: number;
  } | null>(null);
  const timelineRowRef = useRef<HTMLDivElement | null>(null);
  const previewCardElementRef = useRef<HTMLElement | null>(null);
  const lastCorrectPlacementAnimationKeyRef = useRef<string | null>(null);
  const [activeCorrectPlacementAnimationKey, setActiveCorrectPlacementAnimationKey] =
    useState<string | null>(null);
  const correctPlacementFallbackCard =
    displayShowCorrectPlacementPreview &&
    model.interaction.originalChosenSlotIndex !== null
      ? model.render.timelineCards[model.interaction.originalChosenSlotIndex] ?? null
      : null;
  const correctPlacementAnimationKey =
    displayShowCorrectPlacementPreview
      ? (model.render.timelineCelebrationTransitionEvent?.celebrationKey ??
        (correctPlacementFallbackCard
          ? [
              "correct-placement",
              model.interaction.originalChosenSlotIndex,
              correctPlacementFallbackCard.id,
              "revealedYear" in correctPlacementFallbackCard
                ? correctPlacementFallbackCard.revealedYear
                : correctPlacementFallbackCard.releaseYear,
            ].join(":")
          : null))
      : null;
  const {
    activeCelebrationEvent,
    flyAnimationState,
    mineButtonRef,
    previewCardRectRef,
  } = useTimelinePanelCelebrationState({
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

  useEffect(() => {
    if (
      correctPlacementAnimationKey === null ||
      lastCorrectPlacementAnimationKeyRef.current === correctPlacementAnimationKey
    ) {
      return;
    }

    lastCorrectPlacementAnimationKeyRef.current = correctPlacementAnimationKey;
    setActiveCorrectPlacementAnimationKey(correctPlacementAnimationKey);

    const timeoutId = window.setTimeout(() => {
      setActiveCorrectPlacementAnimationKey((currentKey) =>
        currentKey === correctPlacementAnimationKey ? null : currentKey,
      );
    }, timelineCelebrationTransitionContract.correctPlacementHeroDurationSeconds * 1000 + 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [correctPlacementAnimationKey]);

  itemsModel.shouldAnimateCorrectPlacement =
    correctPlacementAnimationKey !== null &&
    activeCorrectPlacementAnimationKey === correctPlacementAnimationKey;
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
    dependencyKey: orderedItemIds,
    timelineRowRef,
  });

  function captureDragOverlaySize() {
    const previewNode = previewCardElementRef.current;
    if (!previewNode) {
      return;
    }

    const previewRect = previewNode.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
      return;
    }

    setDragOverlaySize({
      height: previewRect.height,
      width: previewRect.width,
    });
  }

  function handleDragStart(
    ...args: Parameters<typeof completeDragStart>
  ) {
    captureDragOverlaySize();
    completeDragStart(...args);
  }

  function handleDragEnd(...args: Parameters<typeof completeDragEnd>) {
    completeDragEnd(...args);
    setDragOverlaySize(null);
  }

  function handleDragCancel(...args: Parameters<typeof completeDragCancel>) {
    completeDragCancel(...args);
    setDragOverlaySize(null);
  }

  const dragOverlayStyle = dragOverlaySize
    ? ({
        width: dragOverlaySize.width,
        height: dragOverlaySize.height,
        ["--timeline-card-width" as string]: `${dragOverlaySize.width}px`,
        ["--timeline-card-height" as string]: `${dragOverlaySize.height}px`,
      } as CSSProperties)
    : undefined;

  useLayoutEffect(() => {
    if (!previewCardElementRef.current) {
      return;
    }

    previewCardRectRef.current =
      previewCardElementRef.current.getBoundingClientRect();
  }, [orderedItemIds, previewCard, previewSlotIndex, timelineView]);

  return (
    <section
      className={`${styles.timelinePanel}${
        layoutMode === "desktop" ? ` ${styles.timelinePanelDesktop}` : ""
      }`}
    >
      <TimelinePanelHeader
        model={model.header}
        onMineButtonRef={(node) => {
          mineButtonRef.current = node;
        }}
      />
      {model.render.showHint ? (
        <p className={styles.timelineHint}>{model.render.hint}</p>
      ) : null}
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
            onCardInfoRequest={(card) => setCardForInfo(card)}
            orderedItemIds={orderedItemIds}
            onPreviewCardRef={(node) => {
              previewCardElementRef.current = node;
            }}
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
