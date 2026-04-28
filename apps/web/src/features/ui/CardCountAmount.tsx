import styles from "./CardCountAmount.module.css";

interface CardCountAmountProps {
  amount: number;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  iconClassName?: string | undefined;
}

export function CardCountAmount({
  amount,
  ariaLabel,
  className,
  iconClassName,
}: CardCountAmountProps) {
  return (
    <span
      aria-label={ariaLabel ?? `${amount} card${amount === 1 ? "" : "s"}`}
      className={`${styles.cardCount}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true">{amount}</span>
      <img
        alt=""
        aria-hidden="true"
        className={`${styles.cardIcon}${iconClassName ? ` ${iconClassName}` : ""}`}
        draggable={false}
        src="/card.png"
      />
    </span>
  );
}
