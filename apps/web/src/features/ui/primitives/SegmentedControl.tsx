import { classNames } from "../classNames";
import styles from "./SegmentedControl.module.css";

export interface SegmentedControlOption<T extends string> {
  disabled?: boolean | undefined;
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  "aria-label": string;
  className?: string | undefined;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
}

export function SegmentedControl<T extends string>({
  "aria-label": ariaLabel,
  className,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <div
      aria-label={ariaLabel}
      className={classNames(styles.root, className)}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            aria-checked={isSelected}
            className={classNames(styles.option, isSelected ? styles.selected : undefined)}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
