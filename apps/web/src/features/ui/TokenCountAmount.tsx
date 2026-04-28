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
  return (
    <span
      aria-label={ariaLabel ?? `${amount} TT token${amount === 1 ? "" : "s"}`}
      className={`${styles.tokenCount}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true">{amount}</span>
      <TtTokenIcon
        className={`${styles.tokenIcon}${iconClassName ? ` ${iconClassName}` : ""}`}
      />
    </span>
  );
}
