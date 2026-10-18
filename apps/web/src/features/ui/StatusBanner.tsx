import type { ReactNode } from "react";
import styles from "./StatusBanner.module.css";

type StatusBannerVariant = "danger";

interface StatusBannerProps {
  children: ReactNode;
  className?: string | undefined;
  /** Lets a held action name this banner as its reason. */
  id?: string | undefined;
  variant?: StatusBannerVariant | undefined;
}

export function StatusBanner({ children, className, id, variant = "danger" }: StatusBannerProps) {
  return (
    <p className={`${styles.banner} ${styles[variant]}${className ? ` ${className}` : ""}`} id={id}>
      {children}
    </p>
  );
}
