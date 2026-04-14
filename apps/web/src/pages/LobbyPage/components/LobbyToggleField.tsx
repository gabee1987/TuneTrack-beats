import type { ReactNode } from "react";
import { ToggleField } from "../../../features/ui/ToggleField";

interface LobbyToggleFieldProps {
  checked: boolean;
  hint?: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}

export function LobbyToggleField({
  checked,
  hint,
  label,
  onChange,
}: LobbyToggleFieldProps) {
  return (
    <ToggleField checked={checked} hint={hint} label={label} onChange={onChange} />
  );
}
