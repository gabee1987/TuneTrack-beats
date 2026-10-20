import { useState } from "react";
import { useI18n } from "../../../features/i18n";
import styles from "./HomeTimelineDemo.module.css";

const PLACED_CARDS = [
  { year: 1979, tone: styles.tone1, slot: styles.slot1 },
  { year: 1994, tone: styles.tone3, slot: styles.slot3 },
  { year: 2012, tone: styles.tone4, slot: styles.slot4 },
] as const;

/**
 * The game in one move: a mystery song drops between 1979 and 1994, turns out to be from 1985
 * and is marked correct. It plays once when Home opens and again on a tap; it never loops.
 * Reduced motion shows the finished timeline (the global rule stops the keyframes).
 */
export function HomeTimelineDemo() {
  const { t } = useI18n();
  const [playCount, setPlayCount] = useState(0);

  return (
    <div
      aria-label={t("home.demo.label")}
      className={styles.demo}
      onClick={() => setPlayCount((count) => count + 1)}
      role="img"
    >
      <div className={styles.timeline} key={playCount}>
        <span aria-hidden="true" className={styles.track} />
        {PLACED_CARDS.map((card) => (
          <span
            aria-hidden="true"
            className={`${styles.card} ${card.tone} ${card.slot}`}
            key={card.year}
          >
            <span className={styles.note}>♪</span>
            <span className={styles.year}>{card.year}</span>
          </span>
        ))}
        <span aria-hidden="true" className={`${styles.gap} ${styles.slot2}`} />
        <span aria-hidden="true" className={`${styles.mystery} ${styles.slot2}`}>
          <span className={styles.mysteryInner}>
            <span className={`${styles.face} ${styles.front}`}>?</span>
            <span className={`${styles.face} ${styles.back} ${styles.tone2}`}>
              <span className={styles.note}>♪</span>
              <span className={styles.year}>1985</span>
            </span>
          </span>
          <span className={styles.tick}>✓</span>
        </span>
      </div>
    </div>
  );
}
