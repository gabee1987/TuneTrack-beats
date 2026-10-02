import { motion } from "framer-motion";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createStandardTransition, motionEasings, useReducedMotionPreference } from "../motion";
import { IconButton } from "../ui/primitives";
import styles from "./HintBubble.module.css";

interface HintBubbleProps {
  anchor: HTMLElement;
  body: string;
  dismissLabel: string;
  onDismiss: () => void;
  title: string;
}

interface HintPosition {
  left: number;
  top: number;
}

const BUBBLE_HALF_WIDTH_PX = 140;
const VIEWPORT_GUTTER_PX = 16;
const ANCHOR_GAP_PX = 12;

export function HintBubble({ anchor, body, dismissLabel, onDismiss, title }: HintBubbleProps) {
  const reduceMotion = useReducedMotionPreference();
  const titleId = useId();
  const bodyId = useId();
  const [position, setPosition] = useState<HintPosition>(() => getPosition(anchor));

  useLayoutEffect(() => {
    const updatePosition = () => setPosition(getPosition(anchor));
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const bubble = document.getElementById(titleId)?.closest("[data-hint-bubble]");
      if (!bubble?.contains(target)) {
        onDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onDismiss, titleId]);

  return createPortal(
    <motion.aside
      animate={{ opacity: 1, x: "-50%", y: 0 }}
      aria-describedby={bodyId}
      aria-labelledby={titleId}
      aria-live="polite"
      className={styles.bubble}
      data-hint-bubble="true"
      exit={{ opacity: 0, x: "-50%", y: reduceMotion ? 0 : -6 }}
      initial={{ opacity: 0, x: "-50%", y: reduceMotion ? 0 : 8 }}
      role="dialog"
      style={position}
      transition={{
        ...createStandardTransition(reduceMotion),
        ease: reduceMotion ? motionEasings.standard : motionEasings.emphasized,
      }}
    >
      <div className={styles.copy}>
        <strong className={styles.title} id={titleId}>
          {title}
        </strong>
        <p className={styles.body} id={bodyId}>
          {body}
        </p>
      </div>
      <IconButton aria-label={dismissLabel} onClick={onDismiss} variant="ghost">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="m6.7 6.7 10.6 10.6m0-10.6L6.7 17.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
      </IconButton>
    </motion.aside>,
    document.body,
  );
}

function getPosition(anchor: HTMLElement): HintPosition {
  const rect = anchor.getBoundingClientRect();
  const left = Math.min(
    window.innerWidth - BUBBLE_HALF_WIDTH_PX - VIEWPORT_GUTTER_PX,
    Math.max(BUBBLE_HALF_WIDTH_PX + VIEWPORT_GUTTER_PX, rect.left + rect.width / 2),
  );

  return {
    left,
    top: rect.bottom + ANCHOR_GAP_PX,
  };
}
