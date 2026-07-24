import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./Chip.module.css";

interface ChipBaseProps {
  children: ReactNode;
  className?: string | undefined;
  selected?: boolean | undefined;
}

export type ChipProps = ChipBaseProps & HTMLAttributes<HTMLSpanElement>;

export type ChipButtonProps = ChipBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    selected?: boolean | undefined;
  };

export function Chip({ children, className, selected = false, ...props }: ChipProps) {
  return (
    <span
      {...props}
      className={classNames(styles.chip, selected ? styles.selected : undefined, className)}
    >
      {children}
    </span>
  );
}

export function ChipButton({
  children,
  className,
  selected = false,
  type = "button",
  ...props
}: ChipButtonProps) {
  return (
    <button
      {...props}
      aria-pressed={selected}
      className={classNames(
        styles.chip,
        styles.button,
        selected ? styles.selected : undefined,
        className,
      )}
      type={type}
    >
      {children}
    </button>
  );
}
