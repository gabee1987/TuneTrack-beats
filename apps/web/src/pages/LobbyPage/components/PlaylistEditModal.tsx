import { useVirtualizer } from "@tanstack/react-virtual";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PublicTrackInfo } from "@tunetrack/shared";
import { useI18n } from "../../../features/i18n";
import { createFadeMotion, createStandardTransition } from "../../../features/motion";
import { usePlaylistEditor } from "../hooks/usePlaylistEditor";
import styles from "./PlaylistEditModal.module.css";

interface PlaylistEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function createSheetMotion(reduceMotion: boolean) {
  if (reduceMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  }
  return {
    initial: { opacity: 0, x: 56 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 56 },
  };
}

export function PlaylistEditModal({ isOpen, onClose }: PlaylistEditModalProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;

  const {
    isLoading,
    isSelectMode,
    removeSelected,
    removeTrack,
    selectedIds,
    setSelectMode,
    sortDir,
    sortField,
    toggleSort,
    toggleSelection,
    tracks,
  } = usePlaylistEditor(isOpen);

  const listRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 68,
    overscan: 10,
  });

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <motion.div
      animate={isOpen ? "animate" : "exit"}
      className={styles.overlay}
      initial={false}
      onClick={onClose}
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
      transition={createStandardTransition(reduceMotion)}
      variants={createFadeMotion(reduceMotion)}
    >
      <motion.div
        animate={isOpen ? "animate" : "exit"}
        aria-label={t("lobby.playlist.editLabel")}
        aria-modal="true"
        className={styles.sheet}
        initial={false}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        transition={createStandardTransition(reduceMotion)}
        variants={createSheetMotion(reduceMotion)}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{t("lobby.playlist.title")}</h2>
            {!isLoading && (
              <span className={styles.trackCount}>
                {t("lobby.playlist.trackCount", { count: tracks.length })}
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            {tracks.length > 0 && (
              <button
                className={`${styles.selectBtn} ${isSelectMode ? styles.selectBtnActive : ""}`}
                onClick={() => {
                  setSelectMode(!isSelectMode);
                }}
                type="button"
              >
                {isSelectMode ? t("lobby.playlist.done") : t("lobby.playlist.select")}
              </button>
            )}
            <button
              aria-label={t("lobby.playlist.close")}
              className={styles.closeBtn}
              onClick={onClose}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className={styles.sortBar}>
          <span className={styles.sortLabel}>{t("lobby.playlist.sort")}</span>
          {(["title", "artist", "year"] as const).map((field) => (
            <button
              key={field}
              className={`${styles.sortChip} ${sortField === field ? styles.sortChipActive : ""}`}
              onClick={() => toggleSort(field)}
              type="button"
            >
              {field === "title"
                ? t("lobby.playlist.sortTitle")
                : field === "artist"
                  ? t("lobby.playlist.sortArtist")
                  : t("lobby.playlist.sortYear")}
              {sortField === field && (
                <span className={styles.sortArrow}>{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <span>{t("lobby.playlist.loading")}</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className={styles.emptyState}>{t("lobby.playlist.empty")}</div>
        ) : (
          <div className={styles.listScrollArea} ref={listRef}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const track = tracks[virtualItem.index];
                if (!track) return null;
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TrackRow
                      key={track.id}
                      isSelectMode={isSelectMode}
                      isSelected={selectedIds.has(track.id)}
                      onRemove={removeTrack}
                      onToggleSelect={toggleSelection}
                      track={track}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isSelectMode && selectedIds.size > 0 && (
          <div className={styles.batchToolbar}>
            <span className={styles.batchCount}>
              {t("lobby.playlist.selected", { count: selectedIds.size })}
            </span>
            <button className={styles.batchDeleteBtn} onClick={removeSelected} type="button">
              {t("lobby.playlist.remove", { count: selectedIds.size })}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    portalTarget,
  );
}

const SWIPE_THRESHOLD = 68;
const SWIPE_REVEAL_WIDTH = 80;

interface TrackRowProps {
  isSelectMode: boolean;
  isSelected: boolean;
  onRemove: (trackId: string) => void;
  onToggleSelect: (trackId: string) => void;
  track: PublicTrackInfo;
}

function TrackRow({ isSelectMode, isSelected, onRemove, onToggleSelect, track }: TrackRowProps) {
  const x = useMotionValue(0);
  // Zone width grows as you swipe: right edge pinned, left edge extends leftward
  const zoneWidth = useMotionValue(0);
  const zoneOpacity = useMotionValue(1);
  // Icon fades in + scales up once the zone is wide enough to show it
  const iconOpacity = useTransform(zoneWidth, [0, 40, SWIPE_REVEAL_WIDTH], [0, 0, 1]);
  const iconScale = useTransform(zoneWidth, [40, SWIPE_REVEAL_WIDTH], [0.6, 1]);
  const isRemoving = useRef(false);

  // Keep zone width in sync with drag position
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
        <TrackContent track={track} />
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
      <motion.div
        className={styles.trackRow}
        drag="x"
        dragConstraints={{ left: -SWIPE_REVEAL_WIDTH, right: 0 }}
        dragElastic={{ left: 0.18, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x, cursor: "grab" }}
        whileTap={{ cursor: "grabbing" }}
      >
        <TrackContent track={track} />
      </motion.div>
    </div>
  );
}

function TrackContent({ track }: { track: PublicTrackInfo }) {
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
        </span>
      </div>
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={18}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={18}
    >
      <path d="M18 6 6 18M6 6l12 12" />
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
