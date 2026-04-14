import type { ReactNode } from "react";
import styles from "./SurfaceCard.module.css";

interface SurfaceCardProps {
  as?: "aside" | "div" | "section" | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function SurfaceCard({
  as = "section",
  children,
  className,
}: SurfaceCardProps) {
  const Component = as;

  return (
    <Component className={`${styles.card}${className ? ` ${className}` : ""}`}>
      {children}
    </Component>
  );
}
