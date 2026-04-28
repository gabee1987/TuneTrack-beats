import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  createActionDockMotion,
  createStandardTransition,
} from "../../../features/motion";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import styles from "./GamePageActionPanels.module.css";

const MOBILE_CONTROL_MEDIA_QUERY = "(max-width: 720px), (hover: none) and (pointer: coarse)";

export function useMobileControlPortalTarget(): HTMLElement | null {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    function updatePortalTarget() {
      const shouldPortal =
        typeof window !== "undefined" &&
        window.matchMedia(MOBILE_CONTROL_MEDIA_QUERY).matches;

      setPortalTarget(shouldPortal ? document.body : null);
    }

    updatePortalTarget();

    const mediaQuery = window.matchMedia(MOBILE_CONTROL_MEDIA_QUERY);
    mediaQuery.addEventListener("change", updatePortalTarget);
    window.addEventListener("orientationchange", updatePortalTarget);
    window.addEventListener("resize", updatePortalTarget);

    return () => {
      mediaQuery.removeEventListener("change", updatePortalTarget);
      window.removeEventListener("orientationchange", updatePortalTarget);
      window.removeEventListener("resize", updatePortalTarget);
    };
  }, []);

  return portalTarget;
}

interface ActionDockProps {
  children: React.ReactNode;
  className?: string | undefined;
}

export function ActionDock({ children, className }: ActionDockProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const portalTarget = useMobileControlPortalTarget();
  const dock = (
    <motion.div
      animate="animate"
      className={`${styles.floatingActionDock}${className ? ` ${className}` : ""}`}
      exit="exit"
      initial="initial"
      layout
      transition={createStandardTransition(reduceMotion)}
      variants={createActionDockMotion(reduceMotion)}
    >
      {children}
    </motion.div>
  );

  return portalTarget ? createPortal(dock, portalTarget) : dock;
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
          <TokenCountAmount amount={ttCost} iconClassName={styles.ttCostIcon} />
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
          <TokenCountAmount amount={ttCost} iconClassName={styles.ttCostIcon} />
        </span>
      ) : null}
    </button>
  );
}
