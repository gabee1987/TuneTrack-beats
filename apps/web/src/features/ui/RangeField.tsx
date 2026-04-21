import styles from "./SettingField.module.css";
import { SettingField } from "./SettingField";

interface RangeFieldProps {
  info?: string;
  label: string;
  max: number;
  min: number;
  onChange: (nextValue: number) => void;
  value: number;
}

export function RangeField({
  label,
  info,
  max,
  min,
  onChange,
  value,
}: RangeFieldProps) {
  return (
    <SettingField info={info} label={label} value={value}>
      <input
        className={styles.rangeInput}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </SettingField>
  );
}
