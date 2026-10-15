import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../../../features/ui/classNames";
import styles from "./LobbyCardButton.module.css";

interface LobbyCardButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon: ReactNode;
  /** Read-only for guests: the same row, but not a button and without the chevron. */
  isStatic?: boolean | undefined;
  status: ReactNode;
  title: string;
  tone?: "default" | "attention" | undefined;
}

/** A lobby card that is one tap target: icon, title, status line and a centred chevron. */
export function LobbyCardButton({
  className,
  icon,
  isStatic = false,
  status,
  title,
  tone = "default",
  type = "button",
  ...props
}: LobbyCardButtonProps) {
  const content = (
    <>
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
      <span className={styles.copy}>
        <span className={styles.title}>{title}</span>
        <span className={styles.status}>{status}</span>
      </span>
      {isStatic ? null : (
        <span aria-hidden="true" className={styles.chevron}>
          <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path
              d="M9 6L15 12L9 18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
            />
          </svg>
        </span>
      )}
    </>
  );
  const rowClassName = classNames(
    styles.row,
    tone === "attention" ? styles.attention : undefined,
    className,
  );

  if (isStatic) return <div className={rowClassName}>{content}</div>;

  return (
    <button {...props} className={classNames(rowClassName, styles.pressable)} type={type}>
      {content}
    </button>
  );
}
