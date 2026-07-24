import type { ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  action?: ReactNode | undefined;
  className?: string | undefined;
  description?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  title: ReactNode;
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className={classNames(styles.root, className)}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
