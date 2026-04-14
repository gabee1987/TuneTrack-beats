import type { ReactNode } from "react";
import styles from "../LobbyPage.module.css";

interface LobbySectionHeaderProps {
  badge?: ReactNode;
  description: string;
  title: string;
  titleAs?: "h2" | "h3" | undefined;
  variant?: "default" | "compact" | undefined;
}

export function LobbySectionHeader({
  badge,
  description,
  title,
  titleAs = "h2",
  variant = "default",
}: LobbySectionHeaderProps) {
  const Title = titleAs;
  const isCompact = variant === "compact";

  return (
    <div
      className={`${styles.sectionHeading}${
        isCompact ? ` ${styles.sectionHeadingCompact}` : ""
      }`}
    >
      <div>
        <Title
          className={`${styles.sectionTitle}${
            isCompact ? ` ${styles.sectionTitleCompact}` : ""
          }`}
        >
          {title}
        </Title>
        <p
          className={`${styles.sectionDescription}${
            isCompact ? ` ${styles.sectionDescriptionCompact}` : ""
          }`}
        >
          {description}
        </p>
      </div>
      {badge}
    </div>
  );
}
