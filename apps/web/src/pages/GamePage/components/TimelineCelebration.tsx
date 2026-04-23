import type { TimelineCelebrationTone } from "../GamePage.types";
import { motion, useReducedMotion } from "framer-motion";
import {
  createTimelineCelebrationVariants,
  createTimelineCelebrationTransition,
} from "../../../features/motion";
import styles from "./TimelinePanel.module.css";

interface TimelineCelebrationProps {
  message: string;
  tone?: TimelineCelebrationTone;
}

export function TimelineCelebration({
  message,
  tone = "success",
}: TimelineCelebrationProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const celebrationVariants = createTimelineCelebrationVariants(reduceMotion);

  return (
    <div className={styles.timelineCelebrationLayer}>
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
