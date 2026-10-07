import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  MotionPresence,
  createToastSlideMotion,
  useReducedMotionPreference,
} from "../../../features/motion";
import type { GamePageToast } from "../gamePageToast.types";
import styles from "./GamePageToastStack.module.css";

interface GamePageToastStackProps {
  /** Persistent notices shown above the toasts, such as the connection banner. */
  children?: ReactNode;
  toasts: GamePageToast[];
}

export function GamePageToastStack({ children, toasts }: GamePageToastStackProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      {children}
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
            <span className={styles.toastText}>{toast.message}</span>
          </motion.div>
        ))}
      </MotionPresence>
    </div>
  );
}
