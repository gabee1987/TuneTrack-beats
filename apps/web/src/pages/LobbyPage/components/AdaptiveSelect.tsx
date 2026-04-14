import { useState } from "react";
import { ActionButton } from "../../../features/ui/ActionButton";
import { SelectInput } from "../../../features/ui/SelectInput";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { AdaptiveSelectSheet } from "./AdaptiveSelectSheet";
import styles from "../LobbyPage.module.css";

export interface AdaptiveSelectOption {
  label: string;
  value: string;
}

interface AdaptiveSelectProps {
  label: string;
  onChange: (value: string) => void;
  options: AdaptiveSelectOption[];
  value: string;
}

const MOBILE_SELECT_QUERY =
  "(hover: none) and (pointer: coarse) and (max-width: 960px), (hover: none) and (pointer: coarse) and (max-height: 520px)";

export function AdaptiveSelect({
  label,
  onChange,
  options,
  value,
}: AdaptiveSelectProps) {
  const isCompactTouch = useMediaQuery(MOBILE_SELECT_QUERY);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  if (!isCompactTouch) {
    return (
      <SelectInput
        aria-label={label}
        className={styles.selectInput}
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
        className={styles.mobileSelectButton}
        onClick={() => setIsOpen(true)}
        type="button"
        variant="danger"
      >
        <span className={styles.mobileSelectLabel}>{selectedOption?.label}</span>
        <span className={styles.mobileSelectChevron}>Select</span>
      </ActionButton>

      {isOpen ? (
        <AdaptiveSelectSheet
          label={label}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
          options={options}
          value={value}
        />
      ) : null}
    </>
  );
}
