import { RangeField } from "../../../features/ui/RangeField";

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
    <RangeField
      label={label}
      max={max}
      min={min}
      onChange={onChange}
      value={value}
    />
  );
}
