import { motion, useReducedMotion } from "framer-motion";
import { MotionPresence, createDialogCardMotion, createFadeMotion } from "../motion";
import type { AppLoadingState } from "./AppLoading.types";
import styles from "./AppLoadingOverlay.module.css";

interface AppLoadingOverlayProps {
  loading: AppLoadingState | null;
}

export function AppLoadingOverlay({ loading }: AppLoadingOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <MotionPresence>
      {loading ? (
        <motion.div
          animate="animate"
          aria-live="polite"
          aria-modal="true"
          className={styles.overlay}
          exit="exit"
          initial="initial"
          role="dialog"
          variants={createFadeMotion(reduceMotion)}
        >
          <motion.div
            animate="animate"
            className={styles.panel}
            exit="exit"
            initial="initial"
            variants={createDialogCardMotion(reduceMotion)}
          >
            <MusicLoadingAnimation />
            <div className={styles.copy}>
              <strong>{loading.title}</strong>
              {loading.message ? <span>{loading.message}</span> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </MotionPresence>
  );
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
