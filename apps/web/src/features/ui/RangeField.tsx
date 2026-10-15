import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./SettingField.module.css";
import { SettingField } from "./SettingField";
import { useRulerScroll } from "./useRulerScroll";

interface RangeFieldProps {
  density?: "compact" | "default" | undefined;
  /** One line under the label that says what the setting does. */
  description?: ReactNode | undefined;
  disabled?: boolean;
  info?: string;
  label: string;
  max: number;
  min: number;
  onChange: (nextValue: number) => void;
  value: number;
}

/**
 * The ruler slider (decision 26). Dragging previews the value under the centre line and commits
 * it once, when the ruler comes to rest, so a drag sends one change instead of one per frame.
 */
export function RangeField({
  density = "default",
  description,
  disabled = false,
  label,
  info,
  max,
  min,
  onChange,
  value,
}: RangeFieldProps) {
  const isCompact = density === "compact";
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const [rangeWidth, setRangeWidth] = useState(0);
  const values = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [max, min],
  );
  const minimumTickWidth = isCompact ? 11 : 14;
  const maximumTickWidth = isCompact ? 64 : 72;
  const tickWidth =
    rangeWidth > 0
      ? Math.max(
          minimumTickWidth,
          Math.min(maximumTickWidth, Math.floor(rangeWidth / values.length)),
        )
      : minimumTickWidth;
  const rangeStyle = {
    ["--snap-range-value-count" as string]: values.length,
    ["--snap-range-tick-width" as string]: `${tickWidth}px`,
  } as CSSProperties;
  const { handleTickClick, scrollerProps, shownValue } = useRulerScroll({
    disabled,
    onChange,
    tickWidth,
    value,
  });

  useEffect(() => {
    const range = rangeRef.current;

    if (!range) {
      return;
    }

    setRangeWidth(range.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setRangeWidth(nextWidth);
    });

    resizeObserver.observe(range);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    onChange(Math.max(min, Math.min(max, value + direction)));
  }

  return (
    <SettingField
      className={isCompact ? styles.compactField : undefined}
      description={description}
      info={info}
      label={label}
      value={shownValue}
    >
      <div
        aria-label={label}
        aria-disabled={disabled}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={shownValue}
        className={`${styles.snapRange}${isCompact ? ` ${styles.compactSnapRange}` : ""}`}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        ref={rangeRef}
        role="slider"
        style={rangeStyle}
        tabIndex={disabled ? -1 : 0}
      >
        <div aria-hidden="true" className={styles.snapRangeCenterLine} />
        <div className={styles.snapRangeScroller} {...scrollerProps}>
          {values.map((rangeValue) => {
            const distance = Math.abs(rangeValue - shownValue);
            const isSelected = rangeValue === shownValue;
            const isMajorTick = rangeValue === min || rangeValue === max || distance === 0;

            return (
              <button
                aria-label={`${label}: ${rangeValue}`}
                className={`${styles.snapRangeTick}${
                  isSelected ? ` ${styles.snapRangeTickSelected}` : ""
                }${isMajorTick ? ` ${styles.snapRangeTickMajor}` : ""}`}
                data-range-value={rangeValue}
                disabled={disabled}
                key={rangeValue}
                onClick={(event) => handleTickClick(event, rangeValue)}
                type="button"
              >
                <span className={styles.snapRangeTickLine} />
              </button>
            );
          })}
        </div>
      </div>
    </SettingField>
  );
}
