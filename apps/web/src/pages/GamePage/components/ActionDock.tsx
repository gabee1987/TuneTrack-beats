import { m, useIsPresent } from "framer-motion";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  createActionDockMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import { getUsesMobileControls, subscribeViewport } from "../../../features/viewport/viewportStore";
import styles from "./gamePageActionPanelsStyles";

export function useMobileControlPortalTarget(): HTMLElement | null {
  const usesMobileControls = useSyncExternalStore(subscribeViewport, getUsesMobileControls);
  return usesMobileControls ? document.body : null;
}

interface ActionDockProps {
  children: React.ReactNode;
  className?: string | undefined;
  containerRef?: React.Ref<HTMLDivElement>;
}

export function ActionDock({ children, className, containerRef }: ActionDockProps) {
  const reduceMotion = useReducedMotionPreference();
  const portalTarget = useMobileControlPortalTarget();
  const isPresent = useIsPresent();

  /**
   * On mobile the dock is portaled to `document.body`, so the page's exit transform never
   * carries it away. Its exit animation only fades it to `opacity: 0`, which still receives
   * taps — leaving an invisible dock pinned over whatever screen comes next, right where
   * the home screen's primary action sits (defect B10).
   *
   * An inline dock travels with the page and is harmless, so only the portaled one goes.
   */
  if (portalTarget && !isPresent) {
    return null;
  }

  const dock = (
    <m.div
      ref={containerRef}
      animate="animate"
      className={`${styles.floatingActionDock}${className ? ` ${className}` : ""}`}
      exit="exit"
      initial="initial"
      transition={createStandardTransition(reduceMotion)}
      variants={createActionDockMotion(reduceMotion)}
    >
      {children}
    </m.div>
  );

  return portalTarget ? createPortal(dock, portalTarget) : dock;
}

interface ActionButtonProps {
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ttCost?: number;
  ttCostBadgeRef?: React.Ref<HTMLSpanElement>;
}

export function PrimaryActionButton({
  buttonRef,
  children,
  disabled,
  onClick,
  ttCost,
  ttCostBadgeRef,
}: ActionButtonProps) {
  return (
    <button
      ref={buttonRef}
      className={styles.floatingPrimaryButton}
      disabled={disabled}
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
  buttonRef,
  children,
  disabled,
  onClick,
  ttCost,
  ttCostBadgeRef,
}: ActionButtonProps) {
  return (
    <button
      ref={buttonRef}
      className={styles.floatingSecondaryButton}
      disabled={disabled}
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
