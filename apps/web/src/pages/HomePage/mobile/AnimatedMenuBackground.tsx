import { memo } from "react";
import styles from "./AnimatedMenuBackground.module.css";

function AnimatedMenuBackgroundComponent() {
  return (
    <div className={styles.background} aria-hidden="true">
      <span className={`${styles.orb} ${styles.orbOrange}`} />
      <span className={`${styles.orb} ${styles.orbViolet}`} />
      <span className={`${styles.orb} ${styles.orbRose}`} />
    </div>
  );
}

export const AnimatedMenuBackground = memo(AnimatedMenuBackgroundComponent);
