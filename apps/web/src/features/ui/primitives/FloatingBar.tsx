import type { ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./FloatingBar.module.css";

export interface FloatingBarProps {
  children: ReactNode;
  /** The layout of the bar's own controls. */
  className?: string | undefined;
  /** `top`: under a header, fading into the list; `bottom`: over the list's end. */
  edge: "bottom" | "top";
}

/**
 * A bar with no frame of its own: its controls float on a fade into what scrolls beneath,
 * for a toolbar under a header and for the actions over a list (owner, 2026-10-16).
 */
export function FloatingBar({ children, className, edge }: FloatingBarProps) {
  return <div className={classNames(styles.bar, styles[edge], className)}>{children}</div>;
}
