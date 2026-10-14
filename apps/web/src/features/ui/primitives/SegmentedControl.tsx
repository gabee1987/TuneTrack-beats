import { useLayoutEffect, useRef, useState, type RefObject } from "react";
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

interface ThumbPlacement {
  left: number;
  width: number;
}

export function SegmentedControl<T extends string>({
  "aria-label": ariaLabel,
  className,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const thumbPlacement = useSelectedThumbPlacement(rootRef, value, options.length);

  return (
    <div
      aria-label={ariaLabel}
      className={classNames(styles.root, className)}
      ref={rootRef}
      role="radiogroup"
    >
      {thumbPlacement ? (
        <span
          aria-hidden="true"
          className={styles.thumb}
          style={{ transform: `translateX(${thumbPlacement.left}px)`, width: thumbPlacement.width }}
        />
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            aria-checked={isSelected}
            className={classNames(styles.option, isSelected ? styles.selected : undefined)}
            data-selected={isSelected || undefined}
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

/**
 * Measures the selected option so one thumb can slide under the options instead of the
 * highlight jumping. The thumb mounts already in place, so the control never slides in.
 */
function useSelectedThumbPlacement(
  rootRef: RefObject<HTMLDivElement>,
  value: string,
  optionCount: number,
): ThumbPlacement | null {
  const [placement, setPlacement] = useState<ThumbPlacement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const selected = root.querySelector<HTMLElement>("[data-selected]");
      setPlacement(selected ? { left: selected.offsetLeft, width: selected.offsetWidth } : null);
    };
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [rootRef, value, optionCount]);

  return placement;
}
