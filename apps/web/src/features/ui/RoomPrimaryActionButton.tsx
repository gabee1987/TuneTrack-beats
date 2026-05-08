import type { ButtonHTMLAttributes } from "react";
import styles from "./RoomPrimaryActionButton.module.css";

interface RoomPrimaryActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string | undefined;
  fullWidth?: boolean | undefined;
}

export function RoomPrimaryActionButton({
  children,
  className,
  fullWidth = false,
  ...props
}: RoomPrimaryActionButtonProps) {
  return (
    <button
      {...props}
      className={`${styles.button}${fullWidth ? ` ${styles.fullWidth}` : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <span className={styles.content}>{children}</span>
    </button>
  );
}
