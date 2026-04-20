import styles from "./AnimatedMenuBackground.module.css";

export function AnimatedMenuBackground() {
  return (
    <div className={styles.background} aria-hidden="true">
      <span className={`${styles.orb} ${styles.orbOrange}`} />
      <span className={`${styles.orb} ${styles.orbViolet}`} />
      <span className={`${styles.orb} ${styles.orbRose}`} />
      <span className={`${styles.orb} ${styles.orbCards}`} />
    </div>
  );
}
