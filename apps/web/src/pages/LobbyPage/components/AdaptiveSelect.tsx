import { useState } from "react";
import { SelectInput } from "../../../features/ui/SelectInput";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
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
      <button
        className={styles.mobileSelectButton}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className={styles.mobileSelectLabel}>{selectedOption?.label}</span>
        <span className={styles.mobileSelectChevron}>Select</span>
      </button>

      {isOpen ? (
        <div
          className={styles.mobileSelectOverlay}
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className={styles.mobileSelectSheet}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className={styles.mobileSelectSheetHeader}>
              <div>
                <p className={styles.mobileSelectEyebrow}>{label}</p>
                <h4 className={styles.mobileSelectTitle}>Choose one option</h4>
              </div>
              <button
                className={styles.mobileSelectClose}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className={styles.mobileSelectOptions}>
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    className={`${styles.mobileSelectOption} ${
                      isSelected ? styles.mobileSelectOptionActive : ""
                    }`}
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span>{option.label}</span>
                    {isSelected ? (
                      <span className={styles.mobileSelectOptionState}>Selected</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
