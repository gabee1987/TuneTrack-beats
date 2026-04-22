import styles from "./AppRouteFallback.module.css";

export function AppRouteFallback() {
  return (
    <main className={styles.screen}>
      <section className={styles.skeleton} aria-label="Loading TuneTrack">
        <div className={styles.headerRow}>
          <div className={styles.logoBlock} />
          <div className={styles.iconBlock} />
        </div>
        <div className={styles.heroBlock} />
        <div className={styles.contentStack}>
          <div className={styles.lineWide} />
          <div className={styles.lineMedium} />
          <div className={styles.actionBlock} />
        </div>
      </section>
    </main>
  );
}
