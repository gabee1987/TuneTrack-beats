import { useI18n } from "../i18n";
import { classNames } from "../ui/classNames";
import { Button } from "../ui/primitives";
import styles from "./IdentityChip.module.css";

export interface IdentityChipProps {
  className?: string | undefined;
  disabled?: boolean | undefined;
  displayName: string;
  onChange: () => void;
}

/** "Playing as Player One · Change": who this device plays as, one tap from the Name sheet. */
export function IdentityChip({ className, disabled, displayName, onChange }: IdentityChipProps) {
  const { t } = useI18n();

  return (
    <div className={classNames(styles.chip, className)}>
      <p className={styles.label}>{t("home.playingAs", { name: displayName })}</p>
      <Button disabled={disabled} onClick={onChange} variant="tertiary">
        {t("common.change")}
      </Button>
    </div>
  );
}
