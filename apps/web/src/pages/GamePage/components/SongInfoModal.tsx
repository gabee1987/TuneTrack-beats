import { useI18n } from "../../../features/i18n";
import { useReducedMotionPreference } from "../../../features/motion";
import { Overlay } from "../../../features/overlay";
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

  const hiddenOffset = reduceMotion ? 0 : "100%";

  return (
    <Overlay
      isOpen={card !== null}
      kind="sheet"
      label={card?.title ?? ""}
      onDismiss={onClose}
      panelClassName={styles.sheet}
      panelMotion={{ initial: { y: hiddenOffset }, animate: { y: 0 }, exit: { y: hiddenOffset } }}
      panelTransition={
        reduceMotion
          ? { duration: 0.15 }
          : { type: "spring", damping: 32, stiffness: 340, mass: 0.9 }
      }
      scrimClassName={styles.overlay}
      scrimTransition={{ duration: 0.18 }}
    >
      {card ? (
        <>
          <div className={styles.header}>
            {releaseYear !== undefined ? <span className={styles.year}>{releaseYear}</span> : null}
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
        </>
      ) : null}
    </Overlay>
  );
}
