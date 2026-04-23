import { motion, useReducedMotion } from "framer-motion";
import {
  createActionDockMotion,
  createStandardTransition,
} from "../../../features/motion";
import {
  TtTokenAmount,
} from "../../../features/ui/TtToken";
import styles from "./GamePageActionPanels.module.css";

interface ActionDockProps {
  children: React.ReactNode;
}

export function ActionDock({ children }: ActionDockProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      animate="animate"
      className={styles.floatingActionDock}
      exit="exit"
      initial="initial"
      layout
      transition={createStandardTransition(reduceMotion)}
      variants={createActionDockMotion(reduceMotion)}
    >
      {children}
    </motion.div>
  );
}

interface ActionButtonProps {
  children: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ttCost?: number;
  ttCostBadgeRef?: React.Ref<HTMLSpanElement>;
}

export function PrimaryActionButton({
  children,
  onClick,
  ttCost,
  ttCostBadgeRef,
}: ActionButtonProps) {
  return (
    <button
      className={styles.floatingPrimaryButton}
      onClick={onClick}
      type="button"
    >
      <span className={styles.actionButtonLabel}>{children}</span>
      {ttCost ? (
        <span className={styles.ttCostBadge} ref={ttCostBadgeRef}>
          <TtTokenAmount amount={ttCost} iconClassName={styles.ttCostIcon} />
        </span>
      ) : null}
    </button>
  );
}

export function SecondaryActionButton({
  children,
  onClick,
  ttCost,
  ttCostBadgeRef,
}: ActionButtonProps) {
  return (
    <button
      className={styles.floatingSecondaryButton}
      onClick={onClick}
      type="button"
    >
      <span className={styles.actionButtonLabel}>{children}</span>
      {ttCost ? (
        <span className={styles.ttCostBadge} ref={ttCostBadgeRef}>
          <TtTokenAmount amount={ttCost} iconClassName={styles.ttCostIcon} />
        </span>
      ) : null}
    </button>
  );
}
