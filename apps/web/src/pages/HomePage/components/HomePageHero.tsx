import styles from "../HomePage.module.css";

export function HomePageHero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.eyebrow}>The music timeline party game</div>
      <h1 className={styles.title}>TuneTrack beats</h1>
      <p className={styles.subtitle}>
        Guess when songs were released, challenge bad placements, and race your
        way to the winning timeline.
      </p>
      <p className={styles.heroSupport}>
        Join the room, pick your name, and start playing in seconds.
      </p>
    </section>
  );
}
