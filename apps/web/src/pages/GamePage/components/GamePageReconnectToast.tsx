import type { PublicRoomState } from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { MotionPresence, createFadeMotion, createStandardTransition } from "../../../features/motion";
import { usePlayerReconnectToast } from "../hooks/usePlayerReconnectToast";
import styles from "./GamePageReconnectToast.module.css";

interface GamePageReconnectToastProps {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function GamePageReconnectToast({
  currentPlayerId,
  roomState,
}: GamePageReconnectToastProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const toast = usePlayerReconnectToast(roomState, currentPlayerId);

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
      <MotionPresence mode="sync">
        {toast ? (
          <motion.div
            animate="animate"
            className={styles.toast}
            exit="exit"
            initial="initial"
            key={toast.key}
            transition={createStandardTransition(reduceMotion)}
            variants={createFadeMotion(reduceMotion)}
          >
            <span className={styles.toastDot} aria-hidden="true" />
            <span className={styles.toastText}>
              <strong>{toast.playerName}</strong> reconnected
            </span>
          </motion.div>
        ) : null}
      </MotionPresence>
    </div>
  );
}
