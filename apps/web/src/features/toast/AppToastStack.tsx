import { m } from "framer-motion";
import { MotionPresence, createToastSlideMotion, useReducedMotionPreference } from "../motion";
import { Button } from "../ui/primitives";
import type { AppToast } from "./AppToast.types";
import styles from "./AppToastStack.module.css";

interface AppToastStackProps {
  onDismiss: (id: string) => void;
  toasts: AppToast[];
}

export function AppToastStack({ onDismiss, toasts }: AppToastStackProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      <MotionPresence mode="sync">
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            animate="animate"
            className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}
            exit="exit"
            initial="initial"
            variants={createToastSlideMotion(reduceMotion)}
          >
            <span className={styles.toastText}>{toast.message}</span>
            {toast.action ? (
              <Button
                className={styles.toastAction}
                onClick={() => {
                  toast.action?.onAction();
                  onDismiss(toast.id);
                }}
                variant="ghost"
              >
                {toast.action.label}
              </Button>
            ) : null}
          </m.div>
        ))}
      </MotionPresence>
    </div>
  );
}
