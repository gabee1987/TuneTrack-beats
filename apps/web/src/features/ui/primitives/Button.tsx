import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { triggerPressHaptic } from "../../../services/haptics/triggerPressHaptic";
import { classNames } from "../classNames";
import styles from "./Button.module.css";

export type ButtonVariant = "danger" | "ghost" | "primary" | "secondary";
export type ButtonSize = "lg" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean | undefined;
  haptic?: boolean | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
}

export function Button({
  className,
  fullWidth = false,
  haptic = false,
  onClick,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (haptic && !props.disabled) {
      triggerPressHaptic();
    }

    onClick?.(event);
  };

  return (
    <button
      {...props}
      className={classNames(
        styles.button,
        styles[variant],
        size === "lg" ? styles.lg : undefined,
        fullWidth ? styles.fullWidth : undefined,
        className,
      )}
      onClick={handleClick}
      type={type}
    />
  );
}
