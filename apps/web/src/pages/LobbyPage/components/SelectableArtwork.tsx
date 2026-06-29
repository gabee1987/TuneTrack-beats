import type { ReactNode } from "react";
import styles from "./SelectableArtwork.module.css";

interface SelectableArtworkProps {
  ariaLabel: string;
  children: ReactNode;
  isSelected: boolean;
  onToggle: () => void;
}

export function SelectableArtwork({
  ariaLabel,
  children,
  isSelected,
  onToggle,
}: SelectableArtworkProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className={`${styles.artworkButton} ${isSelected ? styles.artworkSelected : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      type="button"
    >
      <span className={styles.artworkCard}>
        <span className={`${styles.artworkFace} ${styles.artworkFront}`}>{children}</span>
        <span className={`${styles.artworkFace} ${styles.artworkBack}`}>
          <ArtworkCheckIcon />
        </span>
      </span>
    </button>
  );
}

export function SelectableArtworkImage({ src }: { src: string }) {
  return <img alt="" className={styles.artworkImage} src={src} />;
}

export function StaticArtwork({ children }: { children: ReactNode }) {
  return <span className={styles.artworkStatic}>{children}</span>;
}

function ArtworkCheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m20 6-11 11-5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.8}
      />
    </svg>
  );
}
