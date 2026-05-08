import type { PublicTrackInfo } from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../../features/i18n";
import { createFadeMotion, createStandardTransition } from "../../../features/motion";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { usePlaylistEditor, type SortField } from "../hooks/usePlaylistEditor";
import { PlaylistTrackDetailsSheet } from "./PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "./PlaylistTrackList";
import styles from "./PlaylistEditModal.module.css";

interface PlaylistEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SORT_FIELDS: SortField[] = ["title", "artist", "year"];

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
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

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
    updateTrack,
  } = usePlaylistEditor(isOpen);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, tracks],
  );

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
        onClick={(event) => event.stopPropagation()}
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
              <ActionButton
                className={`${styles.selectBtn} ${isSelectMode ? styles.selectBtnActive : ""}`}
                onClick={() => {
                  setSelectedTrackId(null);
                  setSelectMode(!isSelectMode);
                }}
                type="button"
                variant="neutral"
              >
                {isSelectMode ? t("lobby.playlist.done") : t("lobby.playlist.select")}
              </ActionButton>
            )}
            <CloseIconButton ariaLabel={t("lobby.playlist.close")} onClick={onClose} />
          </div>
        </div>

        <PlaylistSortBar activeField={sortField} direction={sortDir} onToggleSort={toggleSort} />

        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <span>{t("lobby.playlist.loading")}</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className={styles.emptyState}>{t("lobby.playlist.empty")}</div>
        ) : (
          <PlaylistTrackList
            isSelectMode={isSelectMode}
            onOpenTrack={(track) => setSelectedTrackId(track.id)}
            onRemoveTrack={removeTrack}
            onToggleSelection={toggleSelection}
            selectedIds={selectedIds}
            tracks={tracks}
          />
        )}

        {isSelectMode && selectedIds.size > 0 && (
          <div className={styles.batchToolbar}>
            <span className={styles.batchCount}>
              {t("lobby.playlist.selected", { count: selectedIds.size })}
            </span>
            <ActionButton
              className={styles.batchDeleteBtn}
              onClick={removeSelected}
              type="button"
              variant="danger"
            >
              {t("lobby.playlist.remove", { count: selectedIds.size })}
            </ActionButton>
          </div>
        )}

        <PlaylistTrackDetailsSheet
          onClose={() => setSelectedTrackId(null)}
          onSave={updateTrack}
          track={selectedTrack}
        />
      </motion.div>
    </motion.div>,
    portalTarget,
  );
}

interface PlaylistSortBarProps {
  activeField: SortField | null;
  direction: "asc" | "desc";
  onToggleSort: (field: SortField) => void;
}

function PlaylistSortBar({ activeField, direction, onToggleSort }: PlaylistSortBarProps) {
  const { t } = useI18n();

  return (
    <div className={styles.sortBar}>
      <span className={styles.sortLabel}>{t("lobby.playlist.sort")}</span>
      {SORT_FIELDS.map((field) => (
        <button
          key={field}
          className={`${styles.sortChip} ${activeField === field ? styles.sortChipActive : ""}`}
          onClick={() => onToggleSort(field)}
          type="button"
        >
          {getSortLabel(t, field)}
          {activeField === field && (
            <span className={styles.sortArrow}>{direction === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function getSortLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  field: SortField,
): string {
  if (field === "artist") return t("lobby.playlist.sortArtist");
  if (field === "year") return t("lobby.playlist.sortYear");
  return t("lobby.playlist.sortTitle");
}
