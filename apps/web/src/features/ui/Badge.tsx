import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeSize = "md" | "sm";
type BadgeVariant = "connected" | "mutedSurface" | "neutral" | "strong";

interface BadgeProps {
  children: ReactNode;
  className?: string | undefined;
  size?: BadgeSize | undefined;
  variant?: BadgeVariant | undefined;
}

export function Badge({
  children,
  className,
  size = "sm",
  variant = "neutral",
}: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[size]} ${styles[variant]}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </span>
  );
}
