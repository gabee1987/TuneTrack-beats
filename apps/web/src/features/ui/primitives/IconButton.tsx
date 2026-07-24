import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./IconButton.module.css";

export type IconButtonSize = "lg" | "md" | "sm";
export type IconButtonVariant = "ghost" | "surface";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  children: ReactNode;
  size?: IconButtonSize | undefined;
  variant?: IconButtonVariant | undefined;
}

export function IconButton({
  children,
  className,
  size = "md",
  type = "button",
  variant = "surface",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        styles.button,
        size !== "md" ? styles[size] : undefined,
        variant === "ghost" ? styles.ghost : undefined,
        className,
      )}
      type={type}
    >
      <span className={styles.icon}>{children}</span>
    </button>
  );
}
