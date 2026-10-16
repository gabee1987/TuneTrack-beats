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
      {trailing === undefined ? null : <div className={styles.trailing}>{trailing}</div>}
    </>
  );
}

// `title` is the row's visible title, not the HTML tooltip attribute.
export type ListRowProps = ListRowContentProps &
  Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    /**
     * Makes the cover and text one button, beside the trailing action rather than around it,
     * so a row can open details and still add in place.
     */
    onOpen?: (() => void) | undefined;
    isOpenDisabled?: boolean | undefined;
  };

export type ListRowButtonProps = ListRowContentProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title">;

export function ListRow({
  className,
  isOpenDisabled,
  leading,
  onOpen,
  subtitle,
  title,
  trailing,
  ...props
}: ListRowProps) {
  if (!onOpen) {
    return (
      <div {...props} className={classNames(styles.row, className)}>
        <ListRowContent leading={leading} subtitle={subtitle} title={title} trailing={trailing} />
      </div>
    );
  }

  return (
    <div {...props} className={classNames(styles.row, className)}>
      <button className={styles.open} disabled={isOpenDisabled} onClick={onOpen} type="button">
        <ListRowContent leading={leading} subtitle={subtitle} title={title} />
      </button>
      <div className={styles.trailing}>{trailing}</div>
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
    <button {...props} className={classNames(styles.row, styles.button, className)} type={type}>
      <ListRowContent leading={leading} subtitle={subtitle} title={title} trailing={trailing} />
    </button>
  );
}
