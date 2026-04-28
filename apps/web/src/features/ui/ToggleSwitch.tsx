import { useI18n } from "../i18n";
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
  offLabel,
  onChange,
  onLabel,
  size = "regular",
}: ToggleSwitchProps) {
  const { t } = useI18n();
  const resolvedOffLabel = offLabel ?? t("common.off");
  const resolvedOnLabel = onLabel ?? t("common.on");

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
      <span className={styles.status}>{checked ? resolvedOnLabel : resolvedOffLabel}</span>
      <span className={styles.thumb} />
    </button>
  );
}
