import type { PublicRoomState } from "@tunetrack/shared";
import { motion } from "framer-motion";
import { useI18n } from "../../../features/i18n";
import {
  MotionPresence,
  createFadeMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
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
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
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
              {t("game.toast.reconnected", { playerName: toast.playerName })}
            </span>
          </motion.div>
        ) : null}
      </MotionPresence>
    </div>
  );
}
