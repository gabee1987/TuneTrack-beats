import { BottomSheet } from "../../../features/ui/BottomSheet";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import type { AdaptiveSelectOption } from "./AdaptiveSelect";
import styles from "../LobbyPage.module.css";

interface AdaptiveSelectSheetProps {
  label: string;
  onChange: (value: string) => void;
  onClose: () => void;
  options: AdaptiveSelectOption[];
  value: string;
}

export function AdaptiveSelectSheet({
  label,
  onChange,
  onClose,
  options,
  value,
}: AdaptiveSelectSheetProps) {
  return (
    <BottomSheet
      onClose={onClose}
      overlayClassName={styles.mobileSelectOverlay}
      sheetClassName={styles.mobileSelectSheet}
    >
      <div className={styles.mobileSelectSheetHeader}>
        <div>
          <p className={styles.mobileSelectEyebrow}>{label}</p>
          <h4 className={styles.mobileSelectTitle}>Choose one option</h4>
        </div>
        <CloseIconButton
          ariaLabel="Close select menu"
          className={styles.mobileSelectClose}
          onClick={onClose}
        />
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
                onClose();
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
    </BottomSheet>
  );
}
