import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { triggerPressHaptic } from "../../../services/haptics/triggerPressHaptic";
import { classNames } from "../classNames";
import styles from "./Button.module.css";

export type ButtonVariant = "danger" | "ghost" | "primary" | "secondary" | "spotify" | "tertiary";
export type ButtonSize = "lg" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean | undefined;
  haptic?: boolean | undefined;
  /** Shows a spinner in place of the label, keeps the width and blocks presses. */
  isLoading?: boolean | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
}

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  haptic = false,
  isLoading = false,
  onClick,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (haptic && !disabled) {
      triggerPressHaptic();
    }

    onClick?.(event);
  };

  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={classNames(
        styles.button,
        styles[variant],
        size === "lg" ? styles.lg : undefined,
        fullWidth ? styles.fullWidth : undefined,
        isLoading ? styles.loading : undefined,
        className,
      )}
      disabled={disabled || isLoading}
      onClick={handleClick}
      type={type}
    >
      {isLoading ? (
        <>
          <span className={styles.loadingLabel}>{children}</span>
          <span aria-hidden="true" className={styles.spinner} />
        </>
      ) : (
        children
      )}
    </button>
  );
}
