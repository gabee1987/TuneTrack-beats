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
      <ListRowCopy subtitle={subtitle} title={title} />
      {trailing === undefined ? null : <div className={styles.trailing}>{trailing}</div>}
    </>
  );
}

function ListRowCopy({ subtitle, title }: Pick<ListRowContentProps, "subtitle" | "title">) {
  return (
    <div className={styles.copy}>
      <p className={styles.title}>{title}</p>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
    </div>
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
    /** The leading control (a cover that selects the row) stays outside the open button. */
    isLeadingSeparate?: boolean | undefined;
  };

export type ListRowButtonProps = ListRowContentProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title">;

export function ListRow({
  className,
  isLeadingSeparate = false,
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

  if (isLeadingSeparate) {
    return (
      <div {...props} className={classNames(styles.row, className)}>
        <div className={styles.leading}>{leading}</div>
        <button
          className={classNames(styles.open, styles.openCopy)}
          disabled={isOpenDisabled}
          onClick={onOpen}
          type="button"
        >
          <ListRowCopy subtitle={subtitle} title={title} />
        </button>
        <div className={styles.trailing}>{trailing}</div>
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
