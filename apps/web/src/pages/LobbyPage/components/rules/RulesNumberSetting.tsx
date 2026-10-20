import { RangeField } from "../../../../features/ui/RangeField";
import { NumberStepper, SettingRow } from "../../../../features/ui/primitives";

/** Phones keep the ruler slider; the desktop assembly uses a stepper (decision 26). */
export type RulesNumberInput = "ruler" | "stepper";

interface RulesNumberSettingProps {
  density?: "compact" | "default" | undefined;
  description?: string | undefined;
  disabled: boolean;
  max: number;
  min: number;
  numberInput: RulesNumberInput;
  onChange: (value: number) => void;
  title: string;
  value: number;
}

export function RulesNumberSetting({
  density = "default",
  description,
  disabled,
  max,
  min,
  numberInput,
  onChange,
  title,
  value,
}: RulesNumberSettingProps) {
  if (numberInput === "ruler") {
    return (
      <RangeField
        density={density}
        description={description}
        disabled={disabled}
        label={title}
        max={max}
        min={min}
        onChange={onChange}
        value={value}
      />
    );
  }

  return (
    <SettingRow description={description} title={title}>
      <NumberStepper
        disabled={disabled}
        isEditable
        label={title}
        max={max}
        min={min}
        onChange={onChange}
        value={value}
      />
    </SettingRow>
  );
}
