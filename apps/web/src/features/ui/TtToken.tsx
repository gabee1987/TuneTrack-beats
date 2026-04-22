import styles from "./TtToken.module.css";

interface TtTokenIconProps {
  className?: string | undefined;
}

interface TtTokenAmountProps {
  amount: number;
  className?: string | undefined;
  iconClassName?: string | undefined;
}

export function TtTokenIcon({ className }: TtTokenIconProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${styles.tokenIcon}${className ? ` ${className}` : ""}`}
      draggable={false}
      src="/tt_icon.png"
    />
  );
}

export function TtTokenAmount({
  amount,
  className,
  iconClassName,
}: TtTokenAmountProps) {
  return (
    <span
      aria-label={`${amount} TT token${amount === 1 ? "" : "s"}`}
      className={`${styles.tokenAmount}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true">{amount}</span>
      <TtTokenIcon className={`${styles.tokenAmountIcon}${iconClassName ? ` ${iconClassName}` : ""}`} />
    </span>
  );
}
