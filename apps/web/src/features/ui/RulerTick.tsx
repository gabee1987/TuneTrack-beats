import type { MouseEvent } from "react";
import { classNames } from "./classNames";
import styles from "./RangeField.module.css";

interface RulerTickProps {
  disabled: boolean;
  /** The ends of the range read a little taller than the ticks between them. */
  isEdge: boolean;
  isSelected: boolean;
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  value: number;
}

export function RulerTick({ disabled, isEdge, isSelected, label, onClick, value }: RulerTickProps) {
  return (
    <button
      aria-label={`${label}: ${value}`}
      className={classNames(
        styles.snapRangeTick,
        isSelected ? styles.snapRangeTickSelected : undefined,
        isEdge ? styles.snapRangeTickMajor : undefined,
      )}
      data-range-value={value}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={styles.snapRangeTickLine} />
    </button>
  );
}
