import type { ReactNode } from "react";
import { IconButton } from "../../../../features/ui/primitives";
import { BackIcon } from "../spotify/spotifySetupIcons";
import styles from "./musicView.module.css";

interface MusicViewHeaderProps {
  /** Actions at the end of the row, such as Add all. */
  actions?: ReactNode | undefined;
  backLabel: string;
  /** A cover between Back and the title. */
  leading?: ReactNode | undefined;
  onBack: () => void;
  subtitle?: ReactNode | undefined;
  title: ReactNode;
}

/**
 * One slim row on top of an opened list in the Music sheet: a 48 px Back, the title with its
 * count under it, and the list's own actions, laid out like the song editor's header.
 */
export function MusicViewHeader({
  actions,
  backLabel,
  leading,
  onBack,
  subtitle,
  title,
}: MusicViewHeaderProps) {
  return (
    <div className={styles.header}>
      <IconButton aria-label={backLabel} onClick={onBack}>
        <BackIcon />
      </IconButton>
      {leading}
      <span className={styles.copy}>
        <strong className={styles.title}>{title}</strong>
        {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
      </span>
      {actions ? <span className={styles.actions}>{actions}</span> : null}
    </div>
  );
}
