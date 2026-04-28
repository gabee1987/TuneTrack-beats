import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "../../../features/i18n";
import { MotionPresence } from "../../../features/motion";
import type { GamePageCard } from "../GamePage.types";
import styles from "./SongInfoModal.module.css";

interface SongInfoModalProps {
  card: GamePageCard | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={14}
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={64} viewBox="0 0 24 24" width={64}>
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}

export function SongInfoModal({ card, onClose }: SongInfoModalProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const artworkUrl = card?.artworkUrl;
  const releaseYear = card && "revealedYear" in card ? card.revealedYear : card?.releaseYear;

  return createPortal(
    <MotionPresence>
      {card ? (
        <motion.div
          key="song-info-overlay"
          animate={{ opacity: 1 }}
          className={styles.overlay}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ y: 0 }}
            className={styles.sheet}
            exit={{ y: reduceMotion ? 0 : "100%" }}
            initial={{ y: reduceMotion ? 0 : "100%" }}
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: "spring", damping: 32, stiffness: 340, mass: 0.9 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              {releaseYear !== undefined ? (
                <span className={styles.year}>{releaseYear}</span>
              ) : null}
              <button
                aria-label={t("game.songInfo.close")}
                className={styles.closeButton}
                type="button"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
            <div className={styles.artwork}>
              {artworkUrl ? (
                <img alt="" className={styles.artworkImg} src={artworkUrl} />
              ) : (
                <MusicNoteIcon />
              )}
            </div>
            <div className={styles.info}>
              <div className={styles.titleRow}>
                <h2 className={styles.title}>{card.title}</h2>
              </div>
              <p className={styles.artist}>{card.artist}</p>
              {card.albumTitle ? <p className={styles.album}>{card.albumTitle}</p> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </MotionPresence>,
    document.body,
  );
}
