import type { ReactNode } from "react";
import { SettingField } from "../../../features/ui/SettingField";

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
  return <SettingField label={label} value={value}>{children}</SettingField>;
}
