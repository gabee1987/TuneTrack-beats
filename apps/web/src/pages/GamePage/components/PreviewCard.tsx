import type { DraggableAttributes } from "@dnd-kit/core";
import { motion, useReducedMotion, type MotionStyle } from "framer-motion";
import { forwardRef, type CSSProperties } from "react";
import {
  createPreviewCardReplaceMotion,
  createPreviewCardReplaceTransition,
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
      <motion.article
        ref={ref}
        key={isReplacing ? `${previewCard.id}-${replacementAnimationKey}` : undefined}
        {...(isReplacing ? { animate: "animate" as const } : {})}
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
        {...(isReplacing ? { initial: "initial" as const } : {})}
        style={
          {
            ["--card-gradient" as string]: getCardGradient(
              theme,
              `${previewCard.id}-preview`,
              isOverlay ? "overlay" : "preview",
            ),
          } as CSSProperties as MotionStyle
        }
        {...(isReplacing
          ? {
              transition: createPreviewCardReplaceTransition(reduceMotion),
              variants: createPreviewCardReplaceMotion(reduceMotion),
            }
          : {})}
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
      </motion.article>
    );
  },
);
