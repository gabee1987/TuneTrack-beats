import { classNames } from "../classNames";
import styles from "./Avatar.module.css";

export type AvatarSize = "lg" | "md" | "sm";

export interface AvatarProps {
  alt?: string | undefined;
  className?: string | undefined;
  initials?: string | undefined;
  size?: AvatarSize | undefined;
  src?: string | undefined;
}

function resolveInitials(initials: string | undefined): string {
  if (!initials) {
    return "?";
  }

  const trimmed = initials.trim();

  if (trimmed.length <= 2) {
    return trimmed.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function Avatar({
  alt = "",
  className,
  initials,
  size = "md",
  src,
}: AvatarProps) {
  return (
    <span className={classNames(styles.avatar, styles[size], className)} aria-hidden={!alt}>
      {src ? (
        <img alt={alt} className={styles.image} src={src} />
      ) : (
        <span>{resolveInitials(initials)}</span>
      )}
    </span>
  );
}
