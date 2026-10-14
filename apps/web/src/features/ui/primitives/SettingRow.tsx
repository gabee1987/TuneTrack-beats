import { useId, type ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./SettingRow.module.css";

export interface SettingRowProps {
  className?: string | undefined;
  /** The control: a stepper, toggle or segmented control, labelled by this row's title. */
  children: ReactNode;
  description?: ReactNode | undefined;
  title: string;
}

/**
 * One setting per row: what it is and what it does on the left, its control on the right.
 * The description sits in the row itself, so no setting needs an info button.
 */
export function SettingRow({ children, className, description, title }: SettingRowProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={classNames(styles.row, className)}
      role="group"
    >
      <div className={styles.copy}>
        <p className={styles.title} id={titleId}>
          {title}
        </p>
        {description ? (
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}
