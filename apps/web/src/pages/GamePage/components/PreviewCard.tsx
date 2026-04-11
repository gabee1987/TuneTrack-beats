import type { DraggableAttributes } from "@dnd-kit/core";
import { forwardRef, type CSSProperties } from "react";
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
  },
);
