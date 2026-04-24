import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { ChallengeMarkerTone, GamePageCard } from "../GamePage.types";
import type { PreviewCardTransitionEvent } from "../gamePageTransitionEvents";
import { TIMELINE_REORDER_DURATION_MS, TIMELINE_REORDER_EASING } from "../gamePage.constants";
import { animateTimelineLayoutChanges, getCardGradient } from "../gamePage.utils";
import { CorrectPlacementCelebration } from "./CorrectPlacementCelebration";
import { PreviewCard } from "./PreviewCard";
import styles from "./TimelinePanel.module.css";

interface TimelineSortableItemProps {
  card: GamePageCard;
  challengeMarkerTone: ChallengeMarkerTone;
  hiddenCardMode: HiddenCardMode;
  id: string;
  isChallengeSlot: boolean;
  isDraggingPreviewCard: boolean;
  isOriginalSlot: boolean;
  isPreview: boolean;
  isPreviewDisabled: boolean;
  previewCardRef?: (node: HTMLElement | null) => void;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  selectable: boolean;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  theme: ThemeId;
}

function TimelineSortableItemComponent({
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
  previewCardTransitionEvent,
  selectable,
  showCorrectPlacementPreview = false,
  showCorrectionPreview = false,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevYearInfo,
  showDevGenreInfo,
  theme,
}: TimelineSortableItemProps) {
  const shouldCelebrateCorrectPlacement =
    !isPreview && isOriginalSlot && showCorrectPlacementPreview;
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
          transitionEvent={previewCardTransitionEvent}
          ref={previewCardRef}
        />
      ) : (
        shouldCelebrateCorrectPlacement ? (
          <CorrectPlacementCelebration
            key={`resolved-correct-placement-${id}`}
            className={`${styles.previewCard} ${styles.previewCardCurrentPick} ${styles.previewCardResolvedCorrect} ${
              isChallengeSlot
                ? challengeMarkerTone === "failure"
                  ? styles.previewCardChallengeFailure
                  : styles.previewCardChallenge
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
          </CorrectPlacementCelebration>
        ) : (
          <article
            data-timeline-card="true"
            className={`${styles.timelineCard} ${
              isOriginalSlot ? styles.timelineCardCurrentPick : ""
            } ${
              isChallengeSlot
                ? challengeMarkerTone === "failure"
                  ? styles.timelineCardChallengeFailure
                  : styles.timelineCardChallenge
                : ""
            }`}
          >
            <>
              <p className={styles.timelineArtist}>{card.artist}</p>
              <div className={styles.timelineCardCenter}>
                <strong className={styles.yearText}>
                  {"revealedYear" in card ? card.revealedYear : ""}
                </strong>
              </div>
              <div className={styles.timelineCardBottom}>
                <h3 className={styles.timelineTitle}>{card.title}</h3>
              </div>
            </>
          </article>
        )
      )}
    </div>
  );
}

export const TimelineSortableItem = memo(TimelineSortableItemComponent);
