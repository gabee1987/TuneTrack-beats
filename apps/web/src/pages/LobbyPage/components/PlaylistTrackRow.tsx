import type { PublicTrackInfo } from "@tunetrack/shared";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { useI18n } from "../../../features/i18n";
import { getPlaylistTrackCurationFlags, shouldShowSourceYear } from "../playlistMetadataFlags";
import styles from "./PlaylistEditModal.module.css";

const SWIPE_THRESHOLD = 68;
const SWIPE_REVEAL_WIDTH = 80;

interface PlaylistTrackRowProps {
  isSelectMode: boolean;
  isSelected: boolean;
  onOpen: (track: PublicTrackInfo) => void;
  onRemove: (trackId: string) => void;
  onToggleSelect: (trackId: string) => void;
  track: PublicTrackInfo;
}

export function PlaylistTrackRow({
  isSelectMode,
  isSelected,
  onOpen,
  onRemove,
  onToggleSelect,
  track,
}: PlaylistTrackRowProps) {
  const x = useMotionValue(0);
  const zoneWidth = useMotionValue(0);
  const zoneOpacity = useMotionValue(1);
  const iconOpacity = useTransform(zoneWidth, [0, 40, SWIPE_REVEAL_WIDTH], [0, 0, 1]);
  const iconScale = useTransform(zoneWidth, [40, SWIPE_REVEAL_WIDTH], [0.6, 1]);
  const isRemoving = useRef(false);

  useEffect(() => {
    return x.on("change", (v) => {
      if (!isRemoving.current) {
        zoneWidth.set(Math.max(0, -v));
      }
    });
  }, [x, zoneWidth]);

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (isRemoving.current) return;
    if (info.offset.x < -SWIPE_THRESHOLD) {
      isRemoving.current = true;
      await Promise.all([
        animate(x, -600, { duration: 0.2, ease: [0.4, 0, 1, 1] }),
        animate(zoneOpacity, 0, { duration: 0.18 }),
      ]);
      onRemove(track.id);
    } else {
      void animate(x, 0, { type: "spring", stiffness: 500, damping: 38 });
    }
  }

  if (isSelectMode) {
    return (
      <button
        className={`${styles.trackSelectRow} ${isSelected ? styles.trackRowSelected : ""}`}
        onClick={() => onToggleSelect(track.id)}
        type="button"
      >
        <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ""}`}>
          {isSelected && <CheckIcon />}
        </div>
        <PlaylistTrackContent track={track} />
      </button>
    );
  }

  return (
    <div className={styles.trackRowWrapper}>
      <motion.div className={styles.deleteZone} style={{ width: zoneWidth, opacity: zoneOpacity }}>
        <motion.div style={{ opacity: iconOpacity, scale: iconScale }}>
          <TrashIcon />
        </motion.div>
      </motion.div>
      <motion.button
        className={styles.trackRow}
        drag="x"
        dragConstraints={{ left: -SWIPE_REVEAL_WIDTH, right: 0 }}
        dragElastic={{ left: 0.18, right: 0 }}
        onClick={() => onOpen(track)}
        onDragEnd={handleDragEnd}
        style={{ x, cursor: "grab" }}
        type="button"
        whileTap={{ cursor: "grabbing" }}
      >
        <PlaylistTrackContent track={track} />
      </motion.button>
    </div>
  );
}

function PlaylistTrackContent({ track }: { track: PublicTrackInfo }) {
  const { t } = useI18n();
  const flags = getPlaylistTrackCurationFlags(track);
  const showSourceYear = shouldShowSourceYear(track);

  return (
    <>
      <div className={styles.trackArtwork}>
        {track.artworkUrl ? (
          <img alt="" className={styles.trackArtworkImg} src={track.artworkUrl} />
        ) : (
          <MusicNoteIcon />
        )}
      </div>
      <div className={styles.trackInfo}>
        <span className={styles.trackTitle}>{track.title}</span>
        <span className={styles.trackMeta}>
          {track.artist}
          {" · "}
          {track.releaseYear}
          {showSourceYear && track.sourceReleaseYear !== undefined
            ? ` · ${t("lobby.playlist.sourceYearShort", { year: track.sourceReleaseYear })}`
            : ""}
        </span>
      </div>
      <div className={styles.trackBadges}>
        {track.metadataStatus === "edited" ? (
          <span
            aria-label={t("lobby.playlist.statusEdited")}
            className={styles.trackBadgeIcon}
            role="img"
            title={t("lobby.playlist.statusEdited")}
          >
            <EditedIcon />
          </span>
        ) : null}
        {track.metadataStatus === "verified" ? (
          <span
            aria-label={t("lobby.playlist.statusVerified")}
            className={`${styles.trackBadgeIcon} ${styles.trackBadgeVerified}`}
            role="img"
            title={t("lobby.playlist.statusVerified")}
          >
            <VerifiedIcon />
          </span>
        ) : null}
        {flags.includes("suspicious_album") ? (
          <span
            aria-label={t("lobby.playlist.statusCheck")}
            className={`${styles.trackBadgeIcon} ${styles.trackBadgeWarning}`}
            role="img"
            title={t("lobby.playlist.statusCheck")}
          >
            <WarningIcon />
          </span>
        ) : null}
      </div>
    </>
  );
}

function EditedIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={13} viewBox="0 0 24 24" width={13}>
      <path
        d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
      <path d="m13.5 7 3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth={2.2} />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={14} viewBox="0 0 24 24" width={14}>
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

function WarningIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={14} viewBox="0 0 24 24" width={14}>
      <path d="M12 4 3 20h18L12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth={2} />
      <path d="M12 9v5" stroke="currentColor" strokeLinecap="round" strokeWidth={2} />
      <path d="M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeWidth={3} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={20}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={20}
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={13}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 24 24"
      width={13}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={18} viewBox="0 0 24 24" width={18}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
