import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import type { HomePageAssemblyProps } from "../HomePage.types";
import styles from "./HomePageMobile.module.css";

export function HomePageMobile({ controller }: HomePageAssemblyProps) {
  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
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
            <p className={styles.description}>
              Build the timeline, challenge risky placements, and turn every
              round into a fast social showdown.
            </p>
          </div>
        </header>

        <section className={styles.previewCard} aria-label="Experience preview">
          <div className={styles.previewTop}>
            <div>
              <p className={styles.previewLabel}>What you do</p>
              <h2 className={styles.previewTitle}>One tap to start. Setup comes next.</h2>
            </div>
            <div className={styles.statusPill}>Mobile first</div>
          </div>

          <div className={styles.featureList}>
            <article className={styles.featureCard}>
              <span className={styles.featureStep}>01</span>
              <h3>Jump in fast</h3>
              <p>Start from one clean entry point instead of filling out the lobby here.</p>
            </article>

            <article className={styles.featureCard}>
              <span className={styles.featureStep}>02</span>
              <h3>Guided setup</h3>
              <p>Lobby settings can become a tighter onboarding flow with just a few choices per step.</p>
            </article>

            <article className={styles.featureCard}>
              <span className={styles.featureStep}>03</span>
              <h3>Built for tension</h3>
              <p>Quick reads, bold contrast, and a dramatic visual tone that fits a music party game.</p>
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
              <span className={styles.primaryActionLabel}>Start the experience</span>
              <span className={styles.primaryActionMeta}>Lobby setup opens next</span>
            </span>
          </button>
        </div>
      </div>
    </AppPageShell>
  );
}
