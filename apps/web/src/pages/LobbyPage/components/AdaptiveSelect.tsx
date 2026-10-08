import { useEffect, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { ActionButton } from "../../../features/ui/ActionButton";
import { SelectInput } from "../../../features/ui/SelectInput";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { AdaptiveSelectSheet } from "./AdaptiveSelectSheet";
import settingsStyles from "../lobbySettings.module.css";
import sheetsStyles from "../lobbySheets.module.css";

export interface AdaptiveSelectOption {
  label: string;
  value: string;
}

interface AdaptiveSelectProps {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: AdaptiveSelectOption[];
  value: string;
}

const MOBILE_SELECT_QUERY =
  "(hover: none) and (pointer: coarse) and (max-width: 960px), (hover: none) and (pointer: coarse) and (max-height: 520px)";

export function AdaptiveSelect({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: AdaptiveSelectProps) {
  const { t } = useI18n();
  const isCompactTouch = useMediaQuery(MOBILE_SELECT_QUERY);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  if (!isCompactTouch) {
    return (
      <SelectInput
        aria-label={label}
        className={settingsStyles.selectInput}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectInput>
    );
  }

  return (
    <>
      <ActionButton
        className={sheetsStyles.mobileSelectButton}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        type="button"
        variant="neutral"
      >
        <span className={sheetsStyles.mobileSelectLabel}>{selectedOption?.label}</span>
        <span className={sheetsStyles.mobileSelectChevron}>{t("lobby.select.select")}</span>
      </ActionButton>

      <AdaptiveSelectSheet
        isOpen={isOpen}
        label={label}
        onChange={(nextValue) => {
          if (!disabled) {
            onChange(nextValue);
          }
        }}
        onClose={() => setIsOpen(false)}
        options={options}
        value={value}
      />
    </>
  );
}
