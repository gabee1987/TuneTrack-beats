import type { MouseEventHandler, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  createBottomSheetMotion,
  createFadeMotion,
  createStandardTransition,
} from "../motion";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
  overlayClassName?: string | undefined;
  sheetClassName?: string | undefined;
}

export function BottomSheet({
  children,
  onClose,
  overlayClassName,
  sheetClassName,
}: BottomSheetProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const stopPropagation: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  return (
    <motion.div
      animate="animate"
      className={`${styles.overlay}${overlayClassName ? ` ${overlayClassName}` : ""}`}
      exit="exit"
      initial="initial"
      onClick={onClose}
      role="presentation"
      transition={createStandardTransition(reduceMotion)}
      variants={createFadeMotion(reduceMotion)}
    >
      <motion.div
        animate="animate"
        className={`${styles.sheet}${sheetClassName ? ` ${sheetClassName}` : ""}`}
        exit="exit"
        initial="initial"
        onClick={stopPropagation}
        role="dialog"
        transition={createStandardTransition(reduceMotion)}
        variants={createBottomSheetMotion(reduceMotion)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
