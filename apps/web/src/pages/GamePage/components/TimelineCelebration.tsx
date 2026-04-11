import { motion } from "framer-motion";
import styles from "./TimelinePanel.module.css";

interface TimelineCelebrationProps {
  message: string;
}

export function TimelineCelebration({
  message,
}: TimelineCelebrationProps) {
  return (
    <div className={styles.timelineCelebrationLayer}>
      <motion.div
        className={styles.timelineCelebrationMessage}
        initial={{
          opacity: 0,
          rotate: -10,
          scale: 0.68,
          y: 26,
        }}
        animate={{
          opacity: [0, 1, 1, 0],
          rotate: [-10, 5, -3, 7],
          scale: [0.68, 1.12, 1.02, 0.9],
          y: [26, -10, -2, -24],
        }}
        exit={{
          opacity: 0,
          rotate: 8,
          scale: 0.9,
          y: -28,
        }}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          times: [0, 0.24, 0.72, 1],
        }}
      >
        {message}
      </motion.div>
    </div>
  );
}
