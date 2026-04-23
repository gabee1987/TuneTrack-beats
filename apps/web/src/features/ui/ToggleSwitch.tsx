import styles from "./ToggleSwitch.module.css";

interface ToggleSwitchProps {
  ariaLabel: string;
  checked: boolean;
  className?: string | undefined;
  offLabel?: string;
  onChange: (checked: boolean) => void;
  onLabel?: string;
  size?: "compact" | "regular";
}

export function ToggleSwitch({
  ariaLabel,
  checked,
  className,
  offLabel = "Off",
  onChange,
  onLabel = "On",
  size = "regular",
}: ToggleSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`${styles.switch} ${checked ? styles.checked : ""} ${
        size === "compact" ? styles.compact : ""
      }${className ? ` ${className}` : ""}`}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={styles.status}>{checked ? onLabel : offLabel}</span>
      <span className={styles.thumb} />
    </button>
  );
}
