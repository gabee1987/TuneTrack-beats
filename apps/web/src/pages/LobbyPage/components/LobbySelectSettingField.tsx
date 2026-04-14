import type { ReactNode } from "react";
import styles from "../LobbyPage.module.css";

interface LobbySelectSettingFieldProps {
  children: ReactNode;
  label: string;
  value?: ReactNode;
}

export function LobbySelectSettingField({
  children,
  label,
  value,
}: LobbySelectSettingFieldProps) {
  return (
    <label className={styles.settingField}>
      <div className={styles.settingLabelRow}>
        <span>{label}</span>
        {value ? <strong className={styles.settingValue}>{value}</strong> : null}
      </div>
      {children}
    </label>
  );
}
