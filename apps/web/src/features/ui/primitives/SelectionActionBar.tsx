import { useI18n } from "../../i18n";
import { MotionReveal, createSelectionBarMotion, useReducedMotionPreference } from "../../motion";
import { Button } from "./Button";
import { FloatingBar } from "./FloatingBar";
import styles from "./SelectionActionBar.module.css";

export interface SelectionAction {
  disabled?: boolean | undefined;
  /** Says what happens and to how many songs, such as "Remove 3". */
  label: string;
  onClick: () => void;
  variant?: "danger" | "primary" | undefined;
}

export interface SelectionActionBarProps {
  actions: readonly SelectionAction[];
  count: number;
}

/**
 * What a list offers while rows are selected: one floating button, or two side by side when
 * the selection can both add and remove (owner, 2026-10-16). No frame, only the fade under
 * it; it rises in with the first selection and leaves with the last. The container places it.
 */
export function SelectionActionBar({ actions, count }: SelectionActionBarProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();

  return (
    <MotionReveal
      className={styles.reveal}
      isShown={count > 0}
      motion={createSelectionBarMotion(reduceMotion)}
    >
      <FloatingBar edge="bottom">
        <div
          aria-label={t("ui.selection.count", { count })}
          className={styles.actions}
          role="toolbar"
        >
          {actions.map((action) => (
            <Button
              disabled={action.disabled}
              fullWidth
              haptic
              key={action.label}
              onClick={action.onClick}
              size="lg"
              variant={action.variant ?? "primary"}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </FloatingBar>
    </MotionReveal>
  );
}
