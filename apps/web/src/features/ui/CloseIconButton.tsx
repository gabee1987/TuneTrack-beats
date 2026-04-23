import type { MouseEventHandler } from "react";
import styles from "./CloseIconButton.module.css";

interface CloseIconButtonProps {
  ariaLabel: string;
  className?: string | undefined;
  onClick: MouseEventHandler<HTMLButtonElement>;
  size?: "md" | "sm";
}

export function CloseIconButton({
  ariaLabel,
  className,
  onClick,
  size = "md",
}: CloseIconButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`${styles.button} ${size === "sm" ? styles.sm : ""}${
        className ? ` ${className}` : ""
      }`}
      onClick={onClick}
      type="button"
    >
      <svg
        aria-hidden="true"
        className={styles.icon}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 6L18 18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M18 6L6 18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}
