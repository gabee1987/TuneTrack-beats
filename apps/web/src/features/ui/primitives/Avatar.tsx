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

  const words = initials.trim().split(/\s+/);

  // A full name shows the first letter of its first two words ("Player One" → "PO").
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  }

  return (words[0] ?? "").slice(0, 2).toUpperCase();
}

export function Avatar({ alt = "", className, initials, size = "md", src }: AvatarProps) {
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
