import type { ButtonHTMLAttributes } from "react";
import styles from "./FormControls.module.css";

type ActionButtonVariant = "danger" | "neutral" | "primary";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string | undefined;
  variant?: ActionButtonVariant | undefined;
}

export function ActionButton({
  className,
  variant = "primary",
  ...props
}: ActionButtonProps) {
  const variantClassName =
    variant === "danger"
      ? styles.buttonDanger
      : variant === "neutral"
        ? styles.buttonNeutral
        : styles.buttonPrimary;

  return (
    <button
      {...props}
      className={`${styles.button} ${variantClassName}${className ? ` ${className}` : ""}`}
    />
  );
}
