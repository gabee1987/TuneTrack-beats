import styles from "../LobbyPage.module.css";

interface LobbyRangeSettingFieldProps {
  label: string;
  max: number;
  min: number;
  onChange: (nextValue: number) => void;
  value: number;
}

export function LobbyRangeSettingField({
  label,
  max,
  min,
  onChange,
  value,
}: LobbyRangeSettingFieldProps) {
  return (
    <label className={styles.settingField}>
      <div className={styles.settingLabelRow}>
        <span>{label}</span>
        <strong className={styles.settingValue}>{value}</strong>
      </div>
      <input
        className={styles.rangeInput}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}
