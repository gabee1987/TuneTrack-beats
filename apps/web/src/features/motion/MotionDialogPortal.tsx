import { motion, useReducedMotion } from "framer-motion";
import type { MouseEventHandler, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  createDialogCardMotion,
  createFadeMotion,
  createStandardTransition,
} from "./coreMotionTokens";
import { MotionPresence } from "./MotionPresence";

interface MotionDialogPortalProps {
  cardClassName: string | undefined;
  children: ReactNode;
  isOpen: boolean;
  label: string;
  onClose: () => void;
  overlayClassName: string | undefined;
}

export function MotionDialogPortal({
  cardClassName,
  children,
  isOpen,
  label,
  onClose,
  overlayClassName,
}: MotionDialogPortalProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  if (!portalTarget) {
    return null;
  }

  const stopPropagation: MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return createPortal(
    <MotionPresence>
      {isOpen ? (
        <motion.div
          animate="animate"
          className={overlayClassName}
          exit="exit"
          initial="initial"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }}
          role="presentation"
          transition={createStandardTransition(reduceMotion)}
          variants={createFadeMotion(reduceMotion)}
        >
          <motion.div
            animate="animate"
            aria-label={label}
            aria-modal="true"
            className={cardClassName}
            exit="exit"
            initial="initial"
            onClick={stopPropagation}
            role="dialog"
            transition={createStandardTransition(reduceMotion)}
            variants={createDialogCardMotion(reduceMotion)}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </MotionPresence>,
    portalTarget,
  );
}
