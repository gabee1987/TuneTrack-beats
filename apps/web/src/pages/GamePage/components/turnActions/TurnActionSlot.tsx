import { m } from "framer-motion";
import type { ReactNode } from "react";
import {
  createActionButtonExitMotion,
  createLayoutTransition,
  useReducedMotionPreference,
} from "../../../../features/motion";
import dockStyles from "../gamePageActionPanelsDock.module.css";

interface TurnActionSlotProps {
  children: ReactNode;
  /** Plays the action's own exit; the slot must then sit directly in a `MotionPresence`. */
  hasExitMotion?: boolean;
  isFullWidth?: boolean;
}

/** Slides an action into its new place when a neighbouring action appears or leaves. */
export function TurnActionSlot({
  children,
  hasExitMotion = false,
  isFullWidth = false,
}: TurnActionSlotProps) {
  const reduceMotion = useReducedMotionPreference();
  const className = isFullWidth
    ? `${dockStyles.actionButtonMotionWrap} ${dockStyles.actionButtonMotionWrapFull}`
    : dockStyles.actionButtonMotionWrap;
  const exitMotionProps = hasExitMotion
    ? {
        animate: "animate",
        exit: "exit",
        initial: "initial",
        style: { originX: 0.5 },
        variants: createActionButtonExitMotion(reduceMotion),
      }
    : {};

  return (
    <m.span
      className={className}
      layout="position"
      transition={createLayoutTransition(reduceMotion)}
      {...exitMotionProps}
    >
      {children}
    </m.span>
  );
}
