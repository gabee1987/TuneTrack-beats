import {
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
} from "@tunetrack/shared";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import {
  createMenuTokenAdjustFlyoutPopTransition,
  createMenuTokenAdjustFlyoutPopVariants,
  createMenuTokenAdjustFlyoutTransition,
  createMenuTokenAdjustFlyoutVariants,
  useReducedMotionPreference,
} from "../../../features/motion";
import { TtTokenIcon } from "../../../features/ui/TtToken";
import styles from "../GamePage.module.css";

type TokenFlyAnimation = "add" | "remove" | null;

interface TokenFlyState {
  direction: Exclude<TokenFlyAnimation, null>;
  originX: number;
  originY: number;
  key: number;
}

interface TokenAdjustButtonsProps {
  currentTokenCount: number;
  onAwardTt: () => void;
  onRemoveTt: () => void;
}

export function TokenAdjustButtons({
  currentTokenCount,
  onAwardTt,
  onRemoveTt,
}: TokenAdjustButtonsProps) {
  const reduceMotion = useReducedMotionPreference();
  const animationKeyRef = useRef(0);
  const tokenActionsRef = useRef<HTMLDivElement | null>(null);
  const addButtonContentRef = useRef<HTMLSpanElement | null>(null);
  const removeButtonContentRef = useRef<HTMLSpanElement | null>(null);
  const [flyAnimations, setFlyAnimations] = useState<TokenFlyState[]>([]);
  const canAddToken = currentTokenCount < MAX_STARTING_TT_TOKEN_COUNT;
  const canRemoveToken = currentTokenCount > MIN_STARTING_TT_TOKEN_COUNT;

  function getFlyAnimationOrigin(direction: Exclude<TokenFlyAnimation, null>) {
    const actionsElement = tokenActionsRef.current;
    const sourceElement =
      direction === "add" ? addButtonContentRef.current : removeButtonContentRef.current;
    if (!actionsElement) {
      return {
        originX: direction === "add" ? 0 : 0,
        originY: 0,
      };
    }
    if (!sourceElement) {
      return {
        originX:
          direction === "add"
            ? actionsElement.clientWidth * 0.25
            : actionsElement.clientWidth * 0.75,
        originY: actionsElement.clientHeight * 0.5,
      };
    }

    const actionsBounds = actionsElement.getBoundingClientRect();
    const sourceBounds = sourceElement.getBoundingClientRect();
    return {
      originX: sourceBounds.left - actionsBounds.left + sourceBounds.width / 2,
      originY: sourceBounds.top - actionsBounds.top + sourceBounds.height / 2,
    };
  }

  function triggerFlyAnimation(direction: Exclude<TokenFlyAnimation, null>) {
    animationKeyRef.current += 1;
    const { originX, originY } = getFlyAnimationOrigin(direction);
    const nextFlyAnimation: TokenFlyState = {
      direction,
      originX,
      originY,
      key: animationKeyRef.current,
    };
    setFlyAnimations((currentAnimations) => [...currentAnimations, nextFlyAnimation]);
  }

  function clearFlyAnimation(animationKey: number) {
    setFlyAnimations((currentAnimations) =>
      currentAnimations.filter((animation) => animation.key !== animationKey),
    );
  }

  return (
    <div className={styles.menuTokenActions} ref={tokenActionsRef}>
      <button
        className={`${styles.menuActionButton} ${styles.menuActionButtonAdd}`}
        disabled={!canAddToken}
        onClick={() => {
          if (!canAddToken) {
            return;
          }
          onAwardTt();
          triggerFlyAnimation("add");
        }}
        type="button"
      >
        <span className={styles.menuTokenActionContent} ref={addButtonContentRef}>
          +1
          <TtTokenIcon className={styles.menuTokenIcon} />
        </span>
      </button>
      <button
        className={`${styles.menuActionButton} ${styles.menuActionButtonRemove}`}
        disabled={!canRemoveToken}
        onClick={() => {
          if (!canRemoveToken) {
            return;
          }
          onRemoveTt();
          triggerFlyAnimation("remove");
        }}
        type="button"
      >
        <span className={styles.menuTokenActionContent} ref={removeButtonContentRef}>
          -1
          <TtTokenIcon className={styles.menuTokenIcon} />
        </span>
      </button>
      {flyAnimations.map((flyAnimation) => (
        <span
          className={styles.menuTokenFlyoutAnchor}
          key={flyAnimation.key}
          style={{ left: flyAnimation.originX, top: flyAnimation.originY }}
        >
          <motion.span
            animate="animate"
            className={`${styles.menuTokenFlyout} ${
              flyAnimation.direction === "add"
                ? styles.menuTokenFlyoutAdd
                : styles.menuTokenFlyoutRemove
            }`}
            initial="initial"
            onAnimationComplete={() => clearFlyAnimation(flyAnimation.key)}
            transition={createMenuTokenAdjustFlyoutTransition(reduceMotion)}
            variants={createMenuTokenAdjustFlyoutVariants(reduceMotion, flyAnimation.direction)}
          >
            <motion.span
              animate="animate"
              className={styles.menuTokenFlyoutContent}
              initial="initial"
              transition={createMenuTokenAdjustFlyoutPopTransition(reduceMotion)}
              variants={createMenuTokenAdjustFlyoutPopVariants(reduceMotion)}
            >
              {flyAnimation.direction === "add" ? "+1" : "-1"}
              <TtTokenIcon className={styles.menuTokenFlyoutIcon} />
            </motion.span>
          </motion.span>
        </span>
      ))}
    </div>
  );
}
