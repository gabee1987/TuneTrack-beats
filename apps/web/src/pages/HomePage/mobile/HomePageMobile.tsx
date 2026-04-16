import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import type { HomePageAssemblyProps } from "../HomePage.types";
import styles from "./HomePageMobile.module.css";

export function HomePageMobile({ controller }: HomePageAssemblyProps) {
  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <div className={styles.backgroundOrbs} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.orbThree} />
      </div>

      <div className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.logoBadge} aria-hidden="true">
            <span className={styles.logoCore}>TT</span>
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Party music timeline game</p>
            <h1 className={styles.title}>TuneTrack Beats</h1>
            {/* <p className={styles.description}>
              Guess when songs came out, place them on the timeline, and challenge wrong picks
            </p> */}
          </div>
        </header>

        <section className={styles.previewCard} aria-label="Experience preview">
          <div className={styles.featureList}>
            <article className={styles.featureCard}>
              <span className={styles.featureStep}>01</span>
              <h3>Guess</h3>
              <p>When did this song come out?</p>
            </article>

            <article className={styles.featureCard}>
              <span className={styles.featureStep}>02</span>
              <h3>Place</h3>
              <p>Drop it where you think it belongs on your timeline</p>
            </article>

            <article className={styles.featureCard}>
              <span className={styles.featureStep}>03</span>
              <h3>Challenge</h3>
              <p>Call out wrong placements from others</p>
            </article>
          </div>
        </section>

        <div className={styles.actionZone}>
          <button
            className={styles.primaryAction}
            onClick={controller.handleQuickStart}
            onFocus={controller.preloadLobby}
            onMouseEnter={controller.preloadLobby}
            onTouchStart={controller.preloadLobby}
            type="button"
          >
            <span className={styles.primaryActionInner}>
              <span className={styles.primaryActionLabel}>Lets go!</span>
            </span>
          </button>
        </div>
      </div>
    </AppPageShell>
  );
}
