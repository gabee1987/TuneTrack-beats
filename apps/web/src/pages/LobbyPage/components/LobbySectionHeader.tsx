import type { ReactNode } from "react";
import styles from "../LobbyPage.module.css";

interface LobbySectionHeaderProps {
  badge?: ReactNode;
  description: string;
  title: ReactNode;
  titleAs?: "h2" | "h3" | undefined;
  titleAccessory?: ReactNode;
  variant?: "default" | "compact" | undefined;
}

export function LobbySectionHeader({
  badge,
  description,
  title,
  titleAs = "h2",
  titleAccessory,
  variant = "default",
}: LobbySectionHeaderProps) {
  const Title = titleAs;
  const isCompact = variant === "compact";

  return (
    <div
      className={`${styles.sectionHeading}${isCompact ? ` ${styles.sectionHeadingCompact}` : ""}`}
    >
      <div>
        <Title
          className={`${styles.sectionTitle}${isCompact ? ` ${styles.sectionTitleCompact}` : ""}`}
        >
          <span className={styles.sectionTitleContent}>
            <span>{title}</span>
            {titleAccessory}
          </span>
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
