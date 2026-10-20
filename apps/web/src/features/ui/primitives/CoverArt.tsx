import { useState } from "react";
import { classNames } from "../classNames";
import { hashText } from "../hashText";
import styles from "./CoverArt.module.css";

/** `fill`: square, as wide as its container (a song's own view). */
export type CoverArtSize = "fill" | "hero" | "lg" | "md" | "sm";

const FALLBACK_STYLES = [
  styles.fallback1,
  styles.fallback2,
  styles.fallback3,
  styles.fallback4,
] as const;
const MOSAIC_TILE_COUNT = 4;

export interface CoverArtProps {
  /** Announces the cover; leave it out when a title beside the cover already names it. */
  alt?: string | undefined;
  className?: string | undefined;
  /** The playlist or song name: picks the fallback colour and initials. */
  label: string;
  /** Up to four covers in a 2 × 2 grid, used when there are four; otherwise the first. */
  mosaic?: readonly string[] | undefined;
  size?: CoverArtSize | undefined;
  src?: string | undefined;
}

export function CoverArt({ alt, className, label, mosaic, size = "md", src }: CoverArtProps) {
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(() => new Set());
  const markFailed = (source: string) =>
    setFailedSources((current) => new Set(current).add(source));
  const sources = pickSources(src, mosaic).filter((source) => !failedSources.has(source));
  const isMosaic = sources.length >= MOSAIC_TILE_COUNT;
  const isAnnounced = Boolean(alt);

  return (
    <span
      aria-hidden={isAnnounced ? undefined : true}
      aria-label={isAnnounced ? alt : undefined}
      className={classNames(
        styles.cover,
        styles[size],
        isMosaic ? styles.mosaic : undefined,
        className,
      )}
      role={isAnnounced ? "img" : undefined}
    >
      {sources.length === 0 ? (
        <span className={classNames(styles.fallback, pickFallbackStyle(label))}>
          {getCoverInitials(label)}
        </span>
      ) : (
        sources
          .slice(0, isMosaic ? MOSAIC_TILE_COUNT : 1)
          .map((source) => (
            <img
              alt=""
              className={styles.image}
              decoding="async"
              key={source}
              loading="lazy"
              onError={() => markFailed(source)}
              src={source}
            />
          ))
      )}
    </span>
  );
}

function pickSources(src: string | undefined, mosaic: readonly string[] | undefined): string[] {
  const sources = mosaic && mosaic.length > 0 ? [...mosaic] : src ? [src] : [];
  return [...new Set(sources)];
}

function pickFallbackStyle(label: string): string | undefined {
  return FALLBACK_STYLES[hashText(label.trim().toLowerCase()) % FALLBACK_STYLES.length];
}

export function getCoverInitials(label: string): string {
  const initials = label
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return initials || "♪";
}
