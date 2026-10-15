import { useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n";
import { classNames } from "../classNames";
import { IconButton } from "./IconButton";
import { StepGlyph } from "./StepGlyph";
import { useRepeatPress } from "./useRepeatPress";
import styles from "./NumberStepper.module.css";

export interface NumberStepperProps {
  className?: string | undefined;
  disabled?: boolean | undefined;
  /** Desktop: the value is also a text box the host can type into. */
  isEditable?: boolean | undefined;
  /** What the number counts, for the value and both buttons ("Cards to win"). */
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number | undefined;
  value: number;
}

export function NumberStepper({
  className,
  disabled = false,
  isEditable = false,
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: NumberStepperProps) {
  const { t } = useI18n();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  // A held button may step again before the parent re-renders with the last value.
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const changeBy = (delta: number) => {
    const next = clamp(latestValueRef.current + delta);
    if (next === latestValueRef.current) return;
    latestValueRef.current = next;
    onChange(next);
  };
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;
  const decreasePress = useRepeatPress(() => changeBy(-step), !canDecrease);
  const increasePress = useRepeatPress(() => changeBy(step), !canIncrease);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = getKeyTarget(event.key, value, step, min, max);
    if (target === null) return;
    event.preventDefault();
    if (!disabled && target !== value) onChange(target);
  };

  return (
    <div className={classNames(styles.stepper, className)} role="group" aria-label={label}>
      <IconButton
        {...decreasePress}
        aria-label={t("ui.numberStepper.decrease", { label })}
        className={styles.stepButton}
        disabled={!canDecrease}
      >
        <StepGlyph />
      </IconButton>
      {isEditable ? (
        <EditableValue
          clamp={clamp}
          disabled={disabled}
          label={label}
          max={max}
          min={min}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          value={value}
        />
      ) : (
        <span
          aria-disabled={disabled || undefined}
          aria-label={label}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={value}
          className={styles.value}
          onKeyDown={handleKeyDown}
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
        >
          {value}
        </span>
      )}
      <IconButton
        {...increasePress}
        aria-label={t("ui.numberStepper.increase", { label })}
        className={styles.stepButton}
        disabled={!canIncrease}
      >
        <StepGlyph isIncrease />
      </IconButton>
    </div>
  );
}

function getKeyTarget(key: string, value: number, step: number, min: number, max: number) {
  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return Math.min(max, value + step);
    case "ArrowDown":
    case "ArrowLeft":
      return Math.max(min, value - step);
    case "Home":
      return min;
    case "End":
      return max;
    default:
      return null;
  }
}

interface EditableValueProps {
  clamp: (value: number) => number;
  disabled: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  value: number;
}

// Typing is kept as a draft and applied on Enter or blur, so "15" can pass through "1" even
// when the minimum is 3.
function EditableValue({
  clamp,
  disabled,
  label,
  max,
  min,
  onChange,
  onKeyDown,
  value,
}: EditableValueProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const typed = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isNaN(typed)) return;
    const next = clamp(typed);
    if (next !== value) onChange(next);
  };

  return (
    <input
      aria-label={label}
      className={classNames(styles.value, styles.input)}
      disabled={disabled}
      inputMode="numeric"
      max={max}
      min={min}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          return;
        }
        if (draft === null) onKeyDown(event);
      }}
      type="number"
      value={draft ?? String(value)}
    />
  );
}
