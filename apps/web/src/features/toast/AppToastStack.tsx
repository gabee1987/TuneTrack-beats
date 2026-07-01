import { motion, useReducedMotion } from "framer-motion";
import { MotionPresence, createToastSlideMotion } from "../motion";
import type { AppToast } from "./AppToast.types";
import styles from "./AppToastStack.module.css";

interface AppToastStackProps {
  toasts: AppToast[];
}

export function AppToastStack({ toasts }: AppToastStackProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      <MotionPresence mode="sync">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            animate="animate"
            className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}
            exit="exit"
            initial="initial"
            variants={createToastSlideMotion(reduceMotion)}
          >
            <span className={styles.toastText}>{toast.message}</span>
          </motion.div>
        ))}
      </MotionPresence>
    </div>
  );
}
