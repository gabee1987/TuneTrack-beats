import type { DraggableAttributes } from "@dnd-kit/core";
import { motion, type MotionStyle } from "framer-motion";
import { forwardRef, type CSSProperties } from "react";
import { useI18n } from "../../../features/i18n";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { ChallengeMarkerTone, GamePageCard } from "../GamePage.types";
import type { PreviewCardTransitionEvent } from "../gamePageTransitionEvents";
import { getCardGradient } from "../gamePage.utils";
import { usePreviewCardTransition } from "../hooks/transitions/usePreviewCardTransition";
import styles from "./TimelinePanel.module.css";

export interface PreviewCardProps {
  attributes?: DraggableAttributes | undefined;
  hiddenCardMode: HiddenCardMode;
  isChallengeSlot: boolean;
  isCorrectPlacement?: boolean;
  isCorrectionPreview?: boolean;
  isGhosted: boolean;
  isOverlay?: boolean;
  isOriginalSlot: boolean;
  listeners?: Record<string, unknown> | undefined;
  previewCard: GamePageCard;
  selectable: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  showRevealedContent?: boolean;
  theme: ThemeId;
  tone: ChallengeMarkerTone;
  transitionEvent: PreviewCardTransitionEvent | null;
}

interface PreviewCardContentProps {
  card: GamePageCard;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  showRevealedContent: boolean;
}

function PreviewCardContent({
  card,
  showDevAlbumInfo,
  showDevCardInfo,
  showDevGenreInfo,
  showDevYearInfo,
  showRevealedContent,
}: PreviewCardContentProps) {
  const { t } = useI18n();

  return showDevCardInfo || showRevealedContent ? (
    <>
      <p className={styles.previewCardArtist}>{card.artist}</p>
      <div className={styles.previewCardCenter}>
        {showDevYearInfo || showRevealedContent ? (
          <strong className={styles.previewCardYear}>
            {"releaseYear" in card ? String(card.releaseYear) : ""}
          </strong>
        ) : null}
        {showDevGenreInfo && "genre" in card && card.genre ? (
          <p className={styles.previewCardMetaPill}>{String(card.genre)}</p>
        ) : null}
      </div>
      <div className={styles.previewCardBottom}>
        {showDevAlbumInfo && "albumTitle" in card ? (
          <p className={styles.previewCardAlbum}>{String(card.albumTitle)}</p>
        ) : null}
        <h3 className={styles.previewCardTitle}>{card.title}</h3>
      </div>
    </>
  ) : (
    <div className={styles.previewCardMysteryOnly}>
      <strong className={styles.previewCardMysteryMark} aria-label={t("game.preview.hiddenTitle")}>
        ?
      </strong>
    </div>
  );
}

export const PreviewCard = forwardRef<HTMLElement, PreviewCardProps>(
  function PreviewCard(
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
      transitionEvent,
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
    const {
      animationControls,
      displayCard,
      displayShowRevealedContent,
      isTransitionActive,
    } = usePreviewCardTransition({
      previewCard,
      showRevealedContent,
      transitionEvent,
    });
    const renderCard = displayCard ?? previewCard;

    return (
      <motion.article
        ref={ref}
        className={`${styles.previewCard} ${
          hiddenCardMode === "gradient"
            ? styles.previewCardGradient
            : styles.previewCardArtwork
        } ${cardToneClass} ${selectable ? styles.previewCardDraggable : ""} ${
          isGhosted ? styles.previewCardGhost : ""
        } ${isOverlay ? styles.previewCardOverlay : ""} ${
          displayShowRevealedContent ? styles.previewCardRevealed : ""
        } ${isCorrectionPreview ? styles.previewCardCorrectionSurface : ""} ${
          isTransitionActive ? styles.previewCardReplacing : ""
        }`}
        animate={animationControls}
        initial={false}
        style={
          {
            ["--card-gradient" as string]: getCardGradient(
              theme,
              `${previewCard.id}-preview`,
              isOverlay ? "overlay" : "preview",
            ),
          } as CSSProperties as MotionStyle
        }
        {...attributes}
        {...listeners}
      >
        <div className={styles.previewCardFace}>
          <PreviewCardContent
            card={renderCard}
            showDevAlbumInfo={showDevAlbumInfo}
            showDevCardInfo={showDevCardInfo}
            showDevGenreInfo={showDevGenreInfo}
            showDevYearInfo={showDevYearInfo}
            showRevealedContent={displayShowRevealedContent}
          />
        </div>
      </motion.article>
    );
  },
);
