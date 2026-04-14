import type { ReactNode } from "react";
import styles from "./SettingField.module.css";

interface SettingFieldProps {
  children: ReactNode;
  label: string;
  value?: ReactNode;
}

export function SettingField({ children, label, value }: SettingFieldProps) {
  return (
    <label className={styles.field}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        {value ? <strong className={styles.value}>{value}</strong> : null}
      </div>
      {children}
    </label>
  );
}
