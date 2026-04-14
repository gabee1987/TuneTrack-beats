import styles from "./AppRouteFallback.module.css";

export function AppRouteFallback() {
  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <div className={styles.pulseDot} />
        <p className={styles.label}>Loading TuneTrack...</p>
      </section>
    </main>
  );
}
