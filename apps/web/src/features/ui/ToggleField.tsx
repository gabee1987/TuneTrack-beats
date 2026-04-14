import type { ReactNode } from "react";
import styles from "./SettingField.module.css";

interface ToggleFieldProps {
  checked: boolean;
  hint?: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}

export function ToggleField({
  checked,
  hint,
  label,
  onChange,
}: ToggleFieldProps) {
  return (
    <label className={styles.toggleField}>
      <div className={styles.toggleCopy}>
        <span className={styles.toggleLabel}>{label}</span>
        {hint ? <span className={styles.toggleHint}>{hint}</span> : null}
      </div>
      <input
        checked={checked}
        className={styles.checkbox}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
