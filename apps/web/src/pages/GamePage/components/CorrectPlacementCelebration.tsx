import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion, type MotionStyle } from "framer-motion";
import {
  createCorrectPlacementCardTransition,
  createCorrectPlacementCardVariants,
  createCorrectPlacementContentTransition,
  createCorrectPlacementContentVariants,
  createCorrectPlacementFillTransition,
  createCorrectPlacementFillVariants,
  createCorrectPlacementShellContentTransition,
  createCorrectPlacementShellContentVariants,
} from "../../../features/motion";
import styles from "./TimelinePanel.module.css";

interface CorrectPlacementCelebrationProps {
  children: ReactNode;
  className: string;
  showDecorativeStars?: boolean;
}

const DECORATIVE_STARS = [
  // Tunable: each star uses its own delay, scale, travel, and rotation so the
  // burst feels hand-timed instead of radial-clockwork.
  // `x`/`y` are final offsets from card center. `arcX`/`arcY` bend the travel
  // so stars do not just shoot out in straight lines.
  { x: -58, y: -64, arcX: -18, arcY: -14, size: 28, delay: 0.01, duration: 1.06, rotate: -48, hue: "violet" },
  { x: 56, y: -54, arcX: 16, arcY: -12, size: 24, delay: 0.09, duration: 1.12, rotate: 36, hue: "pink" },
  { x: -14, y: 72, arcX: -16, arcY: 14, size: 26, delay: 0.16, duration: 1.18, rotate: -68, hue: "gold" },
  { x: -74, y: 16, arcX: -18, arcY: -6, size: 16, delay: 0.05, duration: 1.02, rotate: 52, hue: "pink" },
  { x: 70, y: 30, arcX: 14, arcY: 8, size: 18, delay: 0.2, duration: 1.1, rotate: -42, hue: "violet" },
] as const;

function getDecorativeStarToneClassName(
  hue: (typeof DECORATIVE_STARS)[number]["hue"],
): string {
  switch (hue) {
    case "gold":
      return styles.correctPlacementDecorativeStarGold ?? "";
    case "pink":
      return styles.correctPlacementDecorativeStarPink ?? "";
    default:
      return styles.correctPlacementDecorativeStarViolet ?? "";
  }
}

export function CorrectPlacementCelebration({
  children,
  className,
  showDecorativeStars = true,
}: CorrectPlacementCelebrationProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.article
      animate="animate"
      className={`${className} ${styles.correctPlacementShell}`}
      data-timeline-card="true"
      initial="initial"
      transition={createCorrectPlacementCardTransition(reduceMotion)}
      variants={createCorrectPlacementCardVariants(reduceMotion)}
    >
      <motion.div
        className={styles.correctPlacementShellContent}
        animate="animate"
        initial="initial"
        transition={createCorrectPlacementShellContentTransition(reduceMotion)}
        variants={createCorrectPlacementShellContentVariants(reduceMotion)}
      >
        {children}
      </motion.div>
      <motion.div
        className={styles.correctPlacementFill}
        animate="animate"
        initial="initial"
        transition={createCorrectPlacementFillTransition(reduceMotion)}
        variants={createCorrectPlacementFillVariants(reduceMotion)}
      >
        <motion.div
          className={styles.correctPlacementContent}
          animate="animate"
          initial="initial"
          transition={createCorrectPlacementContentTransition(reduceMotion)}
          variants={createCorrectPlacementContentVariants(reduceMotion)}
        >
          {children}
        </motion.div>
      </motion.div>
      {showDecorativeStars ? (
        <div
          aria-hidden="true"
          className={styles.correctPlacementDecorativeStars}
        >
          {DECORATIVE_STARS.map((star, index) => (
            <motion.span
              key={`${star.x}-${star.y}-${index}`}
              animate={
                reduceMotion
                  ? { opacity: [0, 0.42, 0], scale: [0, 0.72, 0.6], x: [0, star.x], y: [0, star.y] }
                  : {
                      opacity: [0, 0.44, 0.86, 0.62, 0],
                      rotate: [star.rotate * 0.08, star.rotate * 0.42, star.rotate * 0.86, star.rotate],
                      scale: [0, 0.28, 0.74, 0.96, 0.82],
                      x: [0, star.arcX, star.x * 0.78, star.x],
                      y: [0, star.arcY, star.y * 0.8, star.y],
                    }
              }
              className={`${styles.correctPlacementDecorativeStar} ${getDecorativeStarToneClassName(
                star.hue,
              )}`}
              initial={{
                opacity: 0,
                rotate: 0,
                scale: 0,
                x: 0,
                y: 0,
              }}
              style={
                {
                  ["--correct-placement-decorative-star-size" as string]: `${star.size}px`,
                } as CSSProperties as MotionStyle
              }
              transition={{
                // Tunable: keep these ungrouped. Per-star delay + duration is
                // the main control for the reference's staggered feel.
                delay: reduceMotion ? 0 : star.delay,
                duration: reduceMotion ? 0.22 : star.duration,
                ease: reduceMotion ? [0.2, 0.8, 0.2, 1] : "linear",
                times: reduceMotion ? [0, 0.5, 1] : [0, 0.18, 0.52, 0.8, 1],
              }}
            />
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}
