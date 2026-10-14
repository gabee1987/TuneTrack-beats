import { useI18n } from "../../i18n";
import { MotionReveal, createSelectionBarMotion, useReducedMotionPreference } from "../../motion";
import { Button } from "./Button";
import styles from "./SelectionActionBar.module.css";

export interface SelectionAction {
  disabled?: boolean | undefined;
  label: string;
  onClick: () => void;
}

export interface SelectionActionBarProps {
  count: number;
  destructiveAction?: SelectionAction | undefined;
  primaryAction: SelectionAction;
}

/**
 * The bar a list shows while rows are selected: how many, the main action and an optional
 * destructive one. It rises in with the first selection and leaves with the last, so a list
 * never needs its own floating buttons.
 */
export function SelectionActionBar({
  count,
  destructiveAction,
  primaryAction,
}: SelectionActionBarProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const countText = t("ui.selection.count", { count });

  return (
    <MotionReveal
      className={styles.bar}
      isShown={count > 0}
      motion={createSelectionBarMotion(reduceMotion)}
    >
      <div aria-label={countText} className={styles.content} role="toolbar">
        <p aria-live="polite" className={styles.count}>
          {countText}
        </p>
        <div className={styles.actions}>
          {destructiveAction ? (
            <Button
              disabled={destructiveAction.disabled}
              onClick={destructiveAction.onClick}
              variant="danger"
            >
              {destructiveAction.label}
            </Button>
          ) : null}
          <Button disabled={primaryAction.disabled} haptic onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        </div>
      </div>
    </MotionReveal>
  );
}
