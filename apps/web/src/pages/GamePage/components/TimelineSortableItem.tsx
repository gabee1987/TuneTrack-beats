import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type {
  HiddenCardMode,
  RevealedCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { ChallengeMarkerTone, GamePageCard } from "../GamePage.types";
import type { PreviewCardTransitionEvent } from "../gamePageTransitionEvents";
import { TIMELINE_REORDER_DURATION_MS, TIMELINE_REORDER_EASING } from "../gamePage.constants";
import { animateTimelineLayoutChanges, getTimelineCardSurfaceStyle } from "../gamePage.utils";
import { CorrectPlacementCelebration } from "./CorrectPlacementCelebration";
import { PreviewCard } from "./PreviewCard";
import cardsStyles from "./timelineCards.module.css";
import shellStyles from "./timelinePanelShell.module.css";

interface TimelineSortableItemProps {
  card: GamePageCard;
  challengeMarkerTone: ChallengeMarkerTone;
  hiddenCardMode: HiddenCardMode;
  revealedCardMode: RevealedCardMode;
  id: string;
  hintAnchorRef?: (node: HTMLElement | null) => void;
  isChallengeSlot: boolean;
  isDraggingPreviewCard: boolean;
  isOriginalSlot: boolean;
  isPreview: boolean;
  isPreviewDisabled: boolean;
  onCardInfoRequest?: (card: GamePageCard) => void;
  previewCardRef?: (node: HTMLElement | null) => void;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  selectable: boolean;
  shouldAnimateCorrectPlacement?: boolean;
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
  revealedCardMode,
  id,
  hintAnchorRef,
  isChallengeSlot,
  isDraggingPreviewCard,
  isOriginalSlot,
  isPreview,
  isPreviewDisabled,
  onCardInfoRequest,
  previewCardRef,
  previewCardTransitionEvent,
  selectable,
  shouldAnimateCorrectPlacement = false,
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
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
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
      ? getTimelineCardSurfaceStyle(theme, id, card.artworkUrl, revealedCardMode)
      : {}),
  } as CSSProperties;

  const hasArtwork = revealedCardMode === "artwork" && Boolean(card.artworkUrl) && !isPreview;
  const timelineCardClassName = `${cardsStyles.timelineCard} ${
    hasArtwork ? cardsStyles.timelineCardArtwork : ""
  } ${
    isOriginalSlot && (isPreview || shouldCelebrateCorrectPlacement)
      ? cardsStyles.timelineCardCurrentPick
      : ""
  } ${shouldCelebrateCorrectPlacement ? cardsStyles.timelineCardResolvedCorrect : ""} ${
    isChallengeSlot
      ? challengeMarkerTone === "failure"
        ? cardsStyles.timelineCardChallengeFailure
        : cardsStyles.timelineCardChallenge
      : ""
  }`;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        hintAnchorRef?.(node);
      }}
      className={`${shellStyles.timelineItem} ${
        isPreview ? shellStyles.timelineItemPreview : ""
      } ${isDragging && isPreview ? shellStyles.timelineItemPreviewDragging : ""} ${
        isDraggingPreviewCard && isPreview ? shellStyles.timelineItemPreviewGhost : ""
      }`}
      data-timeline-slot="true"
      style={style}
      onClick={
        (!isPreview || showCorrectionPreview) && onCardInfoRequest
          ? () => onCardInfoRequest(card)
          : undefined
      }
    >
      {isPreview ? (
        <PreviewCard
          attributes={selectable ? attributes : undefined}
          hiddenCardMode={hiddenCardMode}
          revealedCardMode={revealedCardMode}
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
      ) : shouldCelebrateCorrectPlacement && shouldAnimateCorrectPlacement ? (
        <CorrectPlacementCelebration
          key={`resolved-correct-placement-${id}`}
          className={`${timelineCardClassName} ${cardsStyles.timelineCardCurrentPick}`}
        >
          <p className={cardsStyles.timelineArtist}>{card.artist}</p>
          <div className={cardsStyles.timelineCardCenter}>
            <strong className={cardsStyles.yearText}>
              {"revealedYear" in card ? card.revealedYear : ""}
            </strong>
          </div>
          <div className={cardsStyles.timelineCardBottom}>
            <h3 className={cardsStyles.timelineTitle}>{card.title}</h3>
          </div>
        </CorrectPlacementCelebration>
      ) : (
        <article data-timeline-card="true" className={timelineCardClassName}>
          <>
            <p className={cardsStyles.timelineArtist}>{card.artist}</p>
            <div className={cardsStyles.timelineCardCenter}>
              <strong className={cardsStyles.yearText}>
                {"revealedYear" in card ? card.revealedYear : ""}
              </strong>
            </div>
            <div className={cardsStyles.timelineCardBottom}>
              <h3 className={cardsStyles.timelineTitle}>{card.title}</h3>
            </div>
          </>
        </article>
      )}
    </div>
  );
}

export const TimelineSortableItem = memo(TimelineSortableItemComponent);
