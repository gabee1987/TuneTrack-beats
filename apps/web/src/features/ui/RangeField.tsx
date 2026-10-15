import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "../i18n";
import { classNames } from "./classNames";
import { StepGlyph } from "./primitives/StepGlyph";
import { useRepeatPress } from "./primitives/useRepeatPress";
import fieldStyles from "./SettingField.module.css";
import styles from "./RangeField.module.css";
import { RulerTick } from "./RulerTick";
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
 * The ruler slider (decision 26) between a − and a + button. Dragging previews the value under the
 * centre line and commits it once, when the ruler comes to rest, so a drag sends one change
 * instead of one per frame; each value passed is felt as a detent.
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
  const { t } = useI18n();
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
  const { handleTickClick, scrollerProps, shownValue, stepBy } = useRulerScroll({
    disabled,
    max,
    min,
    onChange,
    tickWidth,
    value,
  });
  const canDecrease = !disabled && shownValue > min;
  const canIncrease = !disabled && shownValue < max;
  const decreasePress = useRepeatPress(() => stepBy(-1), !canDecrease);
  const increasePress = useRepeatPress(() => stepBy(1), !canIncrease);
  // The number pops only once it has changed, never when the field first appears.
  const [lastShownValue, setLastShownValue] = useState(shownValue);
  const [hasValueChanged, setHasValueChanged] = useState(false);
  if (shownValue !== lastShownValue) {
    setLastShownValue(shownValue);
    setHasValueChanged(true);
  }

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
      className={isCompact ? fieldStyles.compactField : undefined}
      description={description}
      info={info}
      label={label}
      value={
        <span className={hasValueChanged ? styles.valuePop : undefined} key={shownValue}>
          {shownValue}
        </span>
      }
    >
      <div className={styles.rulerRow}>
        <button
          {...decreasePress}
          aria-label={t("ui.numberStepper.decrease", { label })}
          className={styles.stepButton}
          disabled={!canDecrease}
          type="button"
        >
          <StepGlyph />
        </button>
        <div
          aria-label={label}
          aria-disabled={disabled}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={shownValue}
          className={classNames(styles.snapRange, isCompact ? styles.compactSnapRange : undefined)}
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
            {values.map((rangeValue) => (
              <RulerTick
                disabled={disabled}
                isEdge={rangeValue === min || rangeValue === max}
                isSelected={rangeValue === shownValue}
                key={rangeValue}
                label={label}
                onClick={(event) => handleTickClick(event, rangeValue)}
                value={rangeValue}
              />
            ))}
          </div>
        </div>
        <button
          {...increasePress}
          aria-label={t("ui.numberStepper.increase", { label })}
          className={styles.stepButton}
          disabled={!canIncrease}
          type="button"
        >
          <StepGlyph isIncrease />
        </button>
      </div>
    </SettingField>
  );
}
