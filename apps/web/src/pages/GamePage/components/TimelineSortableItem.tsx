import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { ChallengeMarkerTone, GamePageCard } from "../GamePage.types";
import {
  TIMELINE_REORDER_DURATION_MS,
  TIMELINE_REORDER_EASING,
} from "../gamePage.constants";
import {
  animateTimelineLayoutChanges,
  getCardGradient,
} from "../gamePage.utils";
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
  selectable: boolean;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  theme: ThemeId;
}

export function TimelineSortableItem({
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
