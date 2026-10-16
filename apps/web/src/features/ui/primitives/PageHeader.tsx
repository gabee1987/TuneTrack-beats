import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  backLabel: string;
  /** Where the player is, in small green capitals over the title. */
  eyebrow: ReactNode;
  /** A cover between Back and the heading, such as an opened playlist's. */
  leading?: ReactNode | undefined;
  /** Extra information beside the title, such as a song count. */
  meta?: ReactNode | undefined;
  onBack: () => void;
  /** What the player does here. */
  title: ReactNode;
  titleAs?: "h1" | "h2" | "h3" | undefined;
  titleId?: string | undefined;
  /** Actions at the end of the row. */
  trailing?: ReactNode | undefined;
}

/**
 * The one top bar of every page, sheet and view (owner, 2026-10-16): Back on the left, where
 * the player is, and what they do there. The container gives the side gutters.
 */
export function PageHeader({
  backLabel,
  eyebrow,
  leading,
  meta,
  onBack,
  title,
  titleAs: Title = "h2",
  titleId,
  trailing,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <IconButton aria-label={backLabel} onClick={onBack} variant="ghost">
        <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
          <path
            d="M15 6L9 12L15 18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
          />
        </svg>
      </IconButton>
      {leading}
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <div className={styles.titleRow}>
          <Title className={styles.title} id={titleId}>
            {title}
          </Title>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
        </div>
      </div>
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </header>
  );
}
