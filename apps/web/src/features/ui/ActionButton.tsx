import type { ButtonHTMLAttributes } from "react";
import styles from "./FormControls.module.css";

type ActionButtonVariant = "danger" | "primary";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string | undefined;
  variant?: ActionButtonVariant | undefined;
}

export function ActionButton({
  className,
  variant = "primary",
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      className={`${styles.button} ${
        variant === "danger" ? styles.buttonDanger : styles.buttonPrimary
      }${className ? ` ${className}` : ""}`}
    />
  );
}
