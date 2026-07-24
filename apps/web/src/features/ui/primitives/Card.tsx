import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./Card.module.css";

export type CardElement = "aside" | "article" | "div" | "section";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement | undefined;
  children: ReactNode;
  elevated?: boolean | undefined;
  interactive?: boolean | undefined;
}

export function Card({
  as = "section",
  children,
  className,
  elevated = false,
  interactive = false,
  ...props
}: CardProps) {
  const Component = as;

  return (
    <Component
      {...props}
      className={classNames(
        styles.card,
        elevated ? styles.elevated : undefined,
        interactive ? styles.interactive : undefined,
        className,
      )}
    >
      {children}
    </Component>
  );
}

export const cardStyles = styles;
