import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useI18n } from "../../../features/i18n";
import {
  MotionPresence,
  useReducedMotionPreference,
} from "../../../features/motion";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import type { GamePageCard } from "../GamePage.types";
import styles from "./SongInfoModal.module.css";

interface SongInfoModalProps {
  card: GamePageCard | null;
  onClose: () => void;
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
  const reduceMotion = useReducedMotionPreference();
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
              <CloseIconButton
                ariaLabel={t("game.songInfo.close")}
                className={styles.closeButton}
                onClick={onClose}
              />
            </div>
            <div className={styles.sheetBody}>
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
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </MotionPresence>,
    document.body,
  );
}
