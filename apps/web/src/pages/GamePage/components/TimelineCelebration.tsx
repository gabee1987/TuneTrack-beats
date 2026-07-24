import type { TimelineCelebrationTone } from "../GamePage.types";
import { motion } from "framer-motion";
import {
  createTimelineCelebrationVariants,
  createTimelineCelebrationTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import styles from "./timelineStyles";

interface TimelineCelebrationProps {
  message: string;
  tone?: TimelineCelebrationTone;
}

export function TimelineCelebration({
  message,
  tone = "success",
}: TimelineCelebrationProps) {
  const reduceMotion = useReducedMotionPreference();
  const celebrationVariants = createTimelineCelebrationVariants(reduceMotion);

  return (
    <div className={styles.timelineCelebrationLayer}>
      <span
        aria-hidden="true"
        className={`${styles.timelineCelebrationBurst} ${
          tone === "failure"
            ? styles.timelineCelebrationBurstFailure
            : styles.timelineCelebrationBurstSuccess
        }`}
      />
      <motion.div
        className={`${styles.timelineCelebrationMessage} ${
          tone === "failure"
            ? styles.timelineCelebrationMessageFailure
            : styles.timelineCelebrationMessageSuccess
        }`}
        animate="animate"
        exit="exit"
        initial="initial"
        transition={createTimelineCelebrationTransition(reduceMotion)}
        variants={celebrationVariants}
      >
        {message}
      </motion.div>
    </div>
  );
}
