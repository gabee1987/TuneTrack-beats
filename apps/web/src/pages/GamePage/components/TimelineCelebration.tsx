import { Fragment } from "react";
import { m } from "framer-motion";
import {
  createPlacementCelebrationBadgeVariants,
  createPlacementCelebrationGlowVariants,
  createPlacementCelebrationMarkTransition,
  createPlacementCelebrationRingVariants,
  createPlacementCelebrationStageVariants,
  createPlacementConfettiVariants,
  createPlacementMessageVariants,
  createPlacementMessageWordVariants,
  createPlacementShardVariants,
  placementCelebrationContract,
  placementConfettiParticles,
  placementFailureShards,
  useReducedMotionPreference,
} from "../../../features/motion";
import type { TimelineCelebrationTone } from "../GamePage.types";
import styles from "./placementCelebrationPopup.module.css";

interface TimelineCelebrationProps {
  message: string;
  tone?: TimelineCelebrationTone;
}

const SUCCESS_MARK_PATHS = ["M14 27 L23 36 L40 17"] as const;
const FAILURE_MARK_PATHS = ["M17 17 L37 37", "M37 17 L17 37"] as const;

export function TimelineCelebration({ message, tone = "success" }: TimelineCelebrationProps) {
  const reduceMotion = useReducedMotionPreference();
  const isFailure = tone === "failure";
  const markPaths = isFailure ? FAILURE_MARK_PATHS : SUCCESS_MARK_PATHS;
  const words = message.split(/\s+/).filter(Boolean);
  const wordVariants = createPlacementMessageWordVariants(reduceMotion);

  return (
    <div className={styles.layer}>
      <m.div
        animate="animate"
        className={`${styles.stage} ${isFailure ? styles.failure : styles.success}`}
        exit="exit"
        initial="initial"
        variants={createPlacementCelebrationStageVariants(reduceMotion)}
      >
        <div className={styles.badgeAnchor}>
          {reduceMotion ? null : (
            <div aria-hidden="true" className={styles.effects}>
              <m.span
                animate="animate"
                className={styles.glow}
                initial="initial"
                variants={createPlacementCelebrationGlowVariants()}
              />
              {placementCelebrationContract.ringDelaysSeconds.map((delay) => (
                <m.span
                  animate="animate"
                  className={styles.ring}
                  initial="initial"
                  key={delay}
                  variants={createPlacementCelebrationRingVariants(delay)}
                />
              ))}
              {isFailure
                ? placementFailureShards.map((shard, index) => (
                    <m.span
                      animate="animate"
                      className={styles.shard}
                      initial="initial"
                      key={index}
                      variants={createPlacementShardVariants(shard)}
                    />
                  ))
                : placementConfettiParticles.map((particle, index) => (
                    <m.span
                      animate="animate"
                      className={`${styles.confetti} ${styles[particle.shape]} ${styles[particle.hue]}`}
                      initial="initial"
                      key={index}
                      variants={createPlacementConfettiVariants(particle)}
                    />
                  ))}
            </div>
          )}
          <m.div
            animate={isFailure && !reduceMotion ? ["animate", "shake"] : "animate"}
            aria-hidden="true"
            className={styles.badge}
            initial="initial"
            variants={createPlacementCelebrationBadgeVariants(reduceMotion, tone)}
          >
            <svg className={styles.mark} fill="none" viewBox="0 0 54 54">
              {markPaths.map((path, strokeIndex) => (
                <m.path
                  animate={{ pathLength: 1 }}
                  d={path}
                  initial={{ pathLength: reduceMotion ? 1 : 0 }}
                  key={path}
                  transition={createPlacementCelebrationMarkTransition(reduceMotion, strokeIndex)}
                />
              ))}
            </svg>
          </m.div>
        </div>
        <m.p
          animate="animate"
          className={styles.message}
          initial="initial"
          role="status"
          variants={createPlacementMessageVariants(reduceMotion)}
        >
          {words.map((word, index) => (
            <Fragment key={`${word}-${index}`}>
              {index > 0 ? " " : null}
              <m.span className={styles.word} variants={wordVariants}>
                {word}
              </m.span>
            </Fragment>
          ))}
        </m.p>
      </m.div>
    </div>
  );
}
