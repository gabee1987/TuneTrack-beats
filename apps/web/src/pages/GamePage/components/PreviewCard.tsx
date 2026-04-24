import type { DraggableAttributes } from "@dnd-kit/core";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  type MotionStyle,
} from "framer-motion";
import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  createPreviewCardReplaceEnterInitial,
  createPreviewCardReplaceEnterMotion,
  createPreviewCardReplaceExitMotion,
} from "../../../features/motion";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import type { ChallengeMarkerTone, GamePageCard } from "../GamePage.types";
import { getCardGradient } from "../gamePage.utils";
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
  isReplacing?: boolean;
  listeners?: Record<string, unknown> | undefined;
  previewCard: GamePageCard;
  replacementAnimationKey?: number;
  selectable: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  showRevealedContent?: boolean;
  theme: ThemeId;
  tone: ChallengeMarkerTone;
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
    <>
      <p className={styles.previewCardArtist}>TuneTrack</p>
      <div className={styles.previewCardCenter}>
        <strong className={styles.previewCardYear}>TT</strong>
      </div>
      <div className={styles.previewCardBottom}>
        <h3 className={styles.previewCardTitle}>Hidden Until Reveal</h3>
      </div>
    </>
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
      isReplacing = false,
      listeners,
      previewCard,
      replacementAnimationKey = 0,
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
    const reduceMotion = useReducedMotion() ?? false;
    const controls = useAnimationControls();
    const [displayCard, setDisplayCard] = useState(previewCard);
    const [displayShowRevealedContent, setDisplayShowRevealedContent] =
      useState(showRevealedContent);
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

    useEffect(() => {
      if (isReplacing) {
        return;
      }

      setDisplayCard(previewCard);
      setDisplayShowRevealedContent(showRevealedContent);
      controls.set({
        opacity: 1,
        scale: 1,
      });
    }, [controls, isReplacing, previewCard, showRevealedContent]);

    useEffect(() => {
      if (!isReplacing) {
        return;
      }

      let isCancelled = false;

      const runReplacement = async () => {
        await controls.start(createPreviewCardReplaceExitMotion(reduceMotion));

        if (isCancelled) {
          return;
        }

        setDisplayCard(previewCard);
        setDisplayShowRevealedContent(showRevealedContent);
        controls.set(createPreviewCardReplaceEnterInitial(reduceMotion));

        if (isCancelled) {
          return;
        }

        await controls.start(createPreviewCardReplaceEnterMotion(reduceMotion));
      };

      void runReplacement();

      return () => {
        isCancelled = true;
      };
    }, [
      controls,
      isReplacing,
      previewCard,
      reduceMotion,
      replacementAnimationKey,
      showRevealedContent,
    ]);

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
          showRevealedContent ? styles.previewCardRevealed : ""
        } ${isCorrectionPreview ? styles.previewCardCorrectionSurface : ""} ${
          isReplacing ? styles.previewCardReplacing : ""
        }`}
        animate={controls}
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
            card={displayCard}
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
