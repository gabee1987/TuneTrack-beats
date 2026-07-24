import type { Translate } from "../../../features/i18n";
import type { GameHistoryEntry } from "../hooks/useGameHistory";
import styles from "../gamePageStyles";

interface HistoryTabContentProps {
  entries: GameHistoryEntry[];
  t: Translate;
}

export function HistoryTabContent({ entries, t }: HistoryTabContentProps) {
  if (entries.length === 0) {
    return <div className={styles.historyEmpty}>{t("gameMenu.noCardsPlayed")}</div>;
  }

  return (
    <div className={styles.historySection}>
      <ul className={styles.historyList}>
        {[...entries].reverse().map((entry, index) => (
          <li key={`${entry.card.id}-${index}`} className={styles.historyItem}>
            <div className={styles.historyItemArtwork}>
              {entry.card.artworkUrl ? (
                <img alt="" className={styles.historyItemArtworkImg} src={entry.card.artworkUrl} />
              ) : (
                <HistoryMusicNoteIcon />
              )}
            </div>
            <div className={styles.historyItemInfo}>
              <span className={styles.historyItemTitle}>{entry.card.title}</span>
              <span className={styles.historyItemMeta}>
                {entry.card.artist}
                {" · "}
                {entry.card.revealedYear ?? entry.card.releaseYear}
              </span>
            </div>
            <div className={styles.historyItemOutcome}>
              <span className={styles.historyItemPlayer}>{entry.playerDisplayName}</span>
              <div
                className={`${styles.historyOutcomeCircle} ${
                  entry.wasCorrect ? styles.historyOutcomeCorrect : styles.historyOutcomeWrong
                }`}
              >
                {entry.wasCorrect ? <HistoryCheckIcon /> : <HistoryXIcon />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryMusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={18} viewBox="0 0 24 24" width={18}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function HistoryCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={14}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function HistoryXIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={14}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
