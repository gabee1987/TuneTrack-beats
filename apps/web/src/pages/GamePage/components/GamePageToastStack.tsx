import { motion, useReducedMotion } from "framer-motion";
import { MotionPresence, createToastSlideMotion } from "../../../features/motion";
import type { GamePageToast } from "../gamePageToast.types";
import styles from "./GamePageToastStack.module.css";

interface GamePageToastStackProps {
  toasts: GamePageToast[];
}

export function GamePageToastStack({ toasts }: GamePageToastStackProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      <MotionPresence mode="sync">
        {toasts.map((toast) => (
          <motion.div
            animate="animate"
            className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}
            exit="exit"
            initial="initial"
            key={toast.id}
            variants={createToastSlideMotion(reduceMotion)}
          >
            <span className={`${styles.toastDot} ${styles[`toastDot--${toast.type}`]}`} aria-hidden="true" />
            <span className={styles.toastText}>{toast.message}</span>
          </motion.div>
        ))}
      </MotionPresence>
    </div>
  );
}
