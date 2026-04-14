import type { ReactNode } from "react";
import styles from "./StatusBanner.module.css";

type StatusBannerVariant = "danger";

interface StatusBannerProps {
  children: ReactNode;
  className?: string | undefined;
  variant?: StatusBannerVariant | undefined;
}

export function StatusBanner({
  children,
  className,
  variant = "danger",
}: StatusBannerProps) {
  return (
    <p className={`${styles.banner} ${styles[variant]}${className ? ` ${className}` : ""}`}>
      {children}
    </p>
  );
}
