import { useReducedMotionPreference } from "../motion";
import { Overlay } from "../overlay";
import type { AppLoadingState } from "./AppLoading.types";
import styles from "./AppLoadingOverlay.module.css";

interface AppLoadingOverlayProps {
  loading: AppLoadingState | null;
}

export function AppLoadingOverlay({ loading }: AppLoadingOverlayProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <Overlay
      dismissible={false}
      isOpen={loading !== null}
      kind="blocking"
      label={loading?.title ?? ""}
      onDismiss={ignoreDismiss}
      panelClassName={styles.panel}
      scrimClassName={styles.overlay}
      scrimMotion={createLoadingOverlayMotion(reduceMotion)}
    >
      {loading ? (
        <>
          <MusicLoadingAnimation />
          <div aria-live="polite" className={styles.copy}>
            <strong>{loading.title}</strong>
            {loading.message ? <span>{loading.message}</span> : null}
          </div>
        </>
      ) : null}
    </Overlay>
  );
}

function ignoreDismiss() {}

function createLoadingOverlayMotion(reduceMotion: boolean) {
  return {
    initial: { opacity: 0, pointerEvents: "none" },
    animate: {
      opacity: 1,
      pointerEvents: "auto",
      transition: { duration: reduceMotion ? 0.01 : 0.2 },
    },
    exit: {
      opacity: 0,
      pointerEvents: "none",
      transition: { duration: reduceMotion ? 0.01 : 0.16 },
    },
  } as const;
}

function MusicLoadingAnimation() {
  return (
    <div className={styles.animation} aria-hidden="true">
      <div className={styles.record}>
        <span className={styles.recordGroove} />
        <span className={styles.recordLabel} />
      </div>
      <div className={styles.equalizer}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className={`${styles.note} ${styles.noteOne}`}>♪</span>
      <span className={`${styles.note} ${styles.noteTwo}`}>♫</span>
    </div>
  );
}
