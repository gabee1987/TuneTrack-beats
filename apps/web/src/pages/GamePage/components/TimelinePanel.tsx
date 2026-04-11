import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DraggableAttributes,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  TimelineCardPublic,
  TrackCardPublic,
} from "@tunetrack/shared";
import {
  forwardRef,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { TimelinePanelProps } from "../GamePage.types";
import {
  DRAG_ACTIVATION_DISTANCE_PX,
  DRAG_EDGE_SCROLL_MAX_STEP_PX,
  DRAG_EDGE_SCROLL_ZONE_PX,
  TIMELINE_REORDER_DURATION_MS,
  TIMELINE_REORDER_EASING,
  TIMELINE_REORDER_THROTTLE_MS,
} from "../gamePage.constants";
import {
  animateTimelineLayoutChanges,
  getCardGradient,
} from "../gamePage.utils";
import { TimelineCelebration } from "./TimelineCelebration";
import styles from "../GamePage.module.css";

export function TimelinePanel({
  title,
  hint,
  showHint,
  celebrationCard,
  celebrationKey,
  celebrationMessage,
  cardCount,
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
  const [isDraggingPreviewCard, setIsDraggingPreviewCard] = useState(false);
  const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);
  const [flyAnimationState, setFlyAnimationState] = useState<{
    card: TrackCardPublic | TimelineCardPublic;
    sourceRect: DOMRect;
    targetRect: DOMRect;
  } | null>(null);
  const [showCelebrationToast, setShowCelebrationToast] = useState(false);
  const timelineRowRef = useRef<HTMLDivElement | null>(null);
  const previewCardElementRef = useRef<HTMLElement | null>(null);
  const previewCardRectRef = useRef<DOMRect | null>(null);
  const lastPreviewReorderAtRef = useRef(0);
  const lastCelebrationKeyRef = useRef<string | null>(null);
  const mineButtonRef = useRef<HTMLButtonElement | null>(null);
  const previewItemId = "timeline-preview-card";
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE_PX,
      },
    }),
  );
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
      itemIds.splice(previewIndex, 0, previewItemId);
    }

    return itemIds;
  }, [previewCard, previewIndex, timelineCards]);
  const [orderedItemIds, setOrderedItemIds] = useState<string[]>(baseOrderedItemIds);

  useEffect(() => {
    if (!isDraggingPreviewCard) {
      setOrderedItemIds(baseOrderedItemIds);
    }
  }, [baseOrderedItemIds, isDraggingPreviewCard]);

  useEffect(() => {
    if (!timelineRowRef.current) {
      return;
    }

    const rowElement = timelineRowRef.current;

    function updateOverflowState() {
      setHasTimelineOverflow(rowElement.scrollWidth - rowElement.clientWidth > 4);
    }

    updateOverflowState();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflowState();
    });

    resizeObserver.observe(rowElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [orderedItemIds]);

  useLayoutEffect(() => {
    if (!previewCardElementRef.current) {
      return;
    }

    previewCardRectRef.current =
      previewCardElementRef.current.getBoundingClientRect();
  }, [orderedItemIds, previewCard, previewSlotIndex, timelineView]);

  useEffect(() => {
    if (!flyAnimationState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlyAnimationState(null);
    }, 850);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [flyAnimationState]);

  useEffect(() => {
    if (!showCelebrationToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCelebrationToast(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showCelebrationToast]);

  useEffect(() => {
    if (!celebrationKey || lastCelebrationKeyRef.current === celebrationKey) {
      return;
    }

    lastCelebrationKeyRef.current = celebrationKey;
    setShowCelebrationToast(true);

    if (
      !celebrationCard ||
      timelineView === "mine" ||
      !previewCardRectRef.current ||
      !mineButtonRef.current
    ) {
      return;
    }

    setFlyAnimationState({
      card: celebrationCard,
      sourceRect: previewCardRectRef.current,
      targetRect: mineButtonRef.current.getBoundingClientRect(),
    });
  }, [celebrationCard, celebrationKey, timelineView]);

  const timelineItemMap = useMemo(() => {
    const map = new Map<
      string,
      | {
          type: "preview";
          card: TrackCardPublic | TimelineCardPublic;
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
      map.set(previewItemId, {
        type: "preview",
        card: previewCard,
      });
    }

    return map;
  }, [previewCard, timelineCards]);

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
        ((containerRect.left + DRAG_EDGE_SCROLL_ZONE_PX) - translatedRect.left) / 5,
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
    if (event.active.id !== previewItemId) {
      setIsDraggingPreviewCard(false);
      return;
    }

    const slotIndex = orderedItemIds.indexOf(previewItemId);

    if (slotIndex !== -1) {
      onSelectSlot(slotIndex);
    }

    setIsDraggingPreviewCard(false);
  }

  function handleDragCancel() {
    lastPreviewReorderAtRef.current = 0;
    setIsDraggingPreviewCard(false);
  }

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

    if (orderedItemIds.indexOf(previewItemId) === nextPreviewIndex) {
      return;
    }

    const now = performance.now();

    if (now - lastPreviewReorderAtRef.current < TIMELINE_REORDER_THROTTLE_MS) {
      return;
    }

    const nextOrder = timelineCards.map(
      (card, index) => `timeline-card-${card.id}-${index}`,
    );

    nextOrder.splice(nextPreviewIndex, 0, previewItemId);

    lastPreviewReorderAtRef.current = now;
    setOrderedItemIds(nextOrder);
    onSelectSlot(nextPreviewIndex);
  }

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

interface TimelineSortableItemProps {
  card: TrackCardPublic | TimelineCardPublic;
  challengeMarkerTone: "pending" | "success" | "failure";
  hiddenCardMode: HiddenCardMode;
  id: string;
  isChallengeSlot: boolean;
  isDraggingPreviewCard: boolean;
  isOriginalSlot: boolean;
  isPreview: boolean;
  isPreviewDisabled: boolean;
  previewCardRef?: (node: HTMLElement | null) => void;
  selectable: boolean;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  theme: ThemeId;
}

function TimelineSortableItem({
  card,
  challengeMarkerTone,
  hiddenCardMode,
  id,
  isChallengeSlot,
  isDraggingPreviewCard,
  isOriginalSlot,
  isPreview,
  isPreviewDisabled,
  previewCardRef,
  selectable,
  showCorrectPlacementPreview = false,
  showCorrectionPreview = false,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevYearInfo,
  showDevGenreInfo,
  theme,
}: TimelineSortableItemProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      id,
      animateLayoutChanges: animateTimelineLayoutChanges,
      disabled: isPreview ? isPreviewDisabled : false,
      transition: {
        duration: TIMELINE_REORDER_DURATION_MS,
        easing: TIMELINE_REORDER_EASING,
      },
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(!isPreview
      ? {
          ["--card-gradient" as string]: getCardGradient(theme, id),
        }
      : {}),
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.timelineItem} ${
        isPreview ? styles.timelineItemPreview : ""
      } ${isDragging && isPreview ? styles.timelineItemPreviewDragging : ""} ${
        isDraggingPreviewCard && isPreview ? styles.timelineItemPreviewGhost : ""
      }`}
      style={style}
    >
      {isPreview ? (
        <PreviewCard
          attributes={selectable ? attributes : undefined}
          hiddenCardMode={hiddenCardMode}
          isChallengeSlot={isChallengeSlot}
          isCorrectionPreview={showCorrectionPreview}
          isCorrectPlacement={showCorrectPlacementPreview}
          isGhosted={isDragging}
          isOriginalSlot={isOriginalSlot}
          listeners={selectable ? listeners : undefined}
          previewCard={card}
          selectable={selectable}
          showDevAlbumInfo={showDevAlbumInfo}
          showDevCardInfo={showDevCardInfo}
          showDevYearInfo={showDevYearInfo}
          showDevGenreInfo={showDevGenreInfo}
          showRevealedContent={showCorrectionPreview}
          theme={theme}
          tone={challengeMarkerTone}
          ref={previewCardRef}
        />
      ) : (
        <article
          data-timeline-card="true"
          className={`${styles.timelineCard} ${
            isOriginalSlot
              ? showCorrectPlacementPreview
                ? styles.timelineCardResolvedCorrect
                : styles.timelineCardCurrentPick
              : ""
          } ${
            isChallengeSlot
              ? challengeMarkerTone === "failure"
                ? styles.timelineCardChallengeFailure
                : styles.timelineCardChallenge
              : ""
          }`}
        >
          <p className={styles.timelineArtist}>{card.artist}</p>
          <div className={styles.timelineCardCenter}>
            <strong className={styles.yearText}>
              {"revealedYear" in card ? card.revealedYear : ""}
            </strong>
          </div>
          <div className={styles.timelineCardBottom}>
            <h3 className={styles.timelineTitle}>{card.title}</h3>
          </div>
        </article>
      )}
    </div>
  );
}

interface PreviewCardProps {
  attributes?: DraggableAttributes | undefined;
  hiddenCardMode: HiddenCardMode;
  isChallengeSlot: boolean;
  isCorrectPlacement?: boolean;
  isCorrectionPreview?: boolean;
  isGhosted: boolean;
  isOverlay?: boolean;
  isOriginalSlot: boolean;
  listeners?: Record<string, unknown> | undefined;
  previewCard: TrackCardPublic | TimelineCardPublic;
  selectable: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  showRevealedContent?: boolean;
  theme: ThemeId;
  tone: "pending" | "success" | "failure";
}

const PreviewCard = forwardRef<HTMLElement, PreviewCardProps>(function PreviewCard(
  {
    attributes,
    hiddenCardMode,
    isChallengeSlot,
    isCorrectPlacement = false,
    isCorrectionPreview = false,
    isGhosted,
    isOverlay = false,
    isOriginalSlot,
    listeners,
    previewCard,
    selectable,
    showDevAlbumInfo,
    showDevCardInfo,
    showDevYearInfo,
    showDevGenreInfo,
    showRevealedContent = false,
    theme,
    tone,
  },
  ref,
) {
  const cardToneClass = isChallengeSlot
    ? tone === "failure"
      ? styles.previewCardChallengeFailure
      : styles.previewCardChallenge
    : isCorrectPlacement
      ? styles.previewCardResolvedCorrect
      : isCorrectionPreview
        ? styles.previewCardCorrection
        : isOriginalSlot
          ? styles.previewCardCurrentPick
          : "";

  return (
    <article
      ref={ref}
      className={`${styles.previewCard} ${
        hiddenCardMode === "gradient"
          ? styles.previewCardGradient
          : styles.previewCardArtwork
      } ${cardToneClass} ${selectable ? styles.previewCardDraggable : ""} ${
        isGhosted ? styles.previewCardGhost : ""
      } ${isOverlay ? styles.previewCardOverlay : ""} ${
        showRevealedContent ? styles.previewCardRevealed : ""
      } ${isCorrectionPreview ? styles.previewCardCorrectionSurface : ""}`}
      style={
        {
          ["--card-gradient" as string]: getCardGradient(
            theme,
            `${previewCard.id}-preview`,
            isOverlay ? "overlay" : "preview",
          ),
        } as CSSProperties
      }
      {...attributes}
      {...listeners}
    >
      <div className={styles.previewCardFace}>
        {showDevCardInfo || showRevealedContent ? (
          <>
            <p className={styles.previewCardArtist}>{previewCard.artist}</p>
            <div className={styles.previewCardCenter}>
              {showDevYearInfo || showRevealedContent ? (
                <strong className={styles.previewCardYear}>
                  {"releaseYear" in previewCard
                    ? String(previewCard.releaseYear)
                    : ""}
                </strong>
              ) : null}
              {showDevGenreInfo &&
              "genre" in previewCard &&
              previewCard.genre ? (
                <p className={styles.previewCardMetaPill}>
                  {String(previewCard.genre)}
                </p>
              ) : null}
            </div>
            <div className={styles.previewCardBottom}>
              {showDevAlbumInfo && "albumTitle" in previewCard ? (
                <p className={styles.previewCardAlbum}>
                  {String(previewCard.albumTitle)}
                </p>
              ) : null}
              <h3 className={styles.previewCardTitle}>{previewCard.title}</h3>
            </div>
          </>
        ) : (
          <>
            <p className={styles.previewCardArtist}>TuneTrack</p>
            <div className={styles.previewCardCenter}>
              <strong className={styles.previewCardYear}>TT</strong>
            </div>
            <div className={styles.previewCardBottom}>
              <h3 className={styles.previewCardTitle}>Hidden Until Reveal</h3>
            </div>
          </>
        )}
      </div>
    </article>
  );
});
