import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./ListRow.module.css";

interface ListRowContentProps {
  leading?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  title: ReactNode;
  trailing?: ReactNode | undefined;
}

function ListRowContent({ leading, subtitle, title, trailing }: ListRowContentProps) {
  return (
    <>
      <div className={styles.leading}>{leading}</div>
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.trailing}>{trailing}</div>
    </>
  );
}

export type ListRowProps = ListRowContentProps & HTMLAttributes<HTMLDivElement>;

export type ListRowButtonProps = ListRowContentProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

export function ListRow({
  className,
  leading,
  subtitle,
  title,
  trailing,
  ...props
}: ListRowProps) {
  return (
    <div {...props} className={classNames(styles.row, className)}>
      <ListRowContent
        leading={leading}
        subtitle={subtitle}
        title={title}
        trailing={trailing}
      />
    </div>
  );
}

export function ListRowButton({
  className,
  leading,
  subtitle,
  title,
  trailing,
  type = "button",
  ...props
}: ListRowButtonProps) {
  return (
    <button
      {...props}
      className={classNames(styles.row, styles.button, className)}
      type={type}
    >
      <ListRowContent
        leading={leading}
        subtitle={subtitle}
        title={title}
        trailing={trailing}
      />
    </button>
  );
}
