import { useI18n } from "../i18n";
import { TtTokenIcon } from "./TtToken";
import styles from "./TokenCountAmount.module.css";

interface TokenCountAmountProps {
  amount: number;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  iconClassName?: string | undefined;
}

export function TokenCountAmount({
  amount,
  ariaLabel,
  className,
  iconClassName,
}: TokenCountAmountProps) {
  const { t } = useI18n();
  const amountLabel =
    amount === 1 ? t("common.tokenCountOne") : t("common.tokenCount", { count: amount });

  return (
    <span
      aria-label={ariaLabel ?? amountLabel}
      className={`${styles.tokenCount}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true">{amount}</span>
      <TtTokenIcon className={`${styles.tokenIcon}${iconClassName ? ` ${iconClassName}` : ""}`} />
    </span>
  );
}
