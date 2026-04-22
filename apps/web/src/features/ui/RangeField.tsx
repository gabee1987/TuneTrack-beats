import styles from "./SettingField.module.css";
import { SettingField } from "./SettingField";

interface RangeFieldProps {
  density?: "compact" | "default" | undefined;
  info?: string;
  label: string;
  max: number;
  min: number;
  onChange: (nextValue: number) => void;
  value: number;
}

export function RangeField({
  density = "default",
  label,
  info,
  max,
  min,
  onChange,
  value,
}: RangeFieldProps) {
  const isCompact = density === "compact";

  return (
    <SettingField
      className={isCompact ? styles.compactField : undefined}
      info={info}
      label={label}
      value={value}
    >
      <input
        className={`${styles.rangeInput}${isCompact ? ` ${styles.compactRange}` : ""}`}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </SettingField>
  );
}
