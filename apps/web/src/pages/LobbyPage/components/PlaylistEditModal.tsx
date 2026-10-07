import { m } from "framer-motion";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../features/i18n";
import {
  createFadeMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import {
  isHistoryState,
  playlistEditorHistoryStateKey,
  playlistTrackHistoryStateKey,
  useCurrentHistoryState,
} from "../hooks/playlistEditorHistory";
import { usePlaylistEditor, type SortField } from "../hooks/usePlaylistEditor";
import { PlaylistTrackDetailsSheet } from "./PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "./PlaylistTrackList";
import chromeStyles from "./playlistEditChrome.module.css";
import listStyles from "./playlistEditList.module.css";

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
  const reduceMotion = useReducedMotionPreference();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = useCurrentHistoryState(location.state);
  const historyEntryId = locationState[playlistEditorHistoryStateKey];
  const selectedTrackId =
    typeof historyEntryId === "string" ? getSelectedTrackId(locationState, historyEntryId) : null;
  const isHistoryOpen = isOpen && typeof historyEntryId === "string";

  const {
    isLoading,
    removeSelected,
    removeTrack,
    selectedIds,
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
  if (!portalTarget || !isHistoryOpen) return null;

  function navigateCurrentPath(state: Record<string, unknown>) {
    navigate(
      {
        hash: location.hash,
        pathname: location.pathname,
        search: location.search,
      },
      { state },
    );
  }

  function closePlaylistEditor() {
    onClose();
  }

  function openTrackEditor(trackId: string) {
    if (typeof historyEntryId !== "string") return;

    navigateCurrentPath({
      ...locationState,
      [playlistEditorHistoryStateKey]: historyEntryId,
      [playlistTrackHistoryStateKey]: { historyEntryId, trackId },
    });
  }

  function closeTrackEditor() {
    if (selectedTrackId) {
      navigate(-1);
    }
  }

  return createPortal(
    <m.div
      animate="animate"
      className={chromeStyles.overlay}
      initial={false}
      onClick={closePlaylistEditor}
      style={{ pointerEvents: "auto" }}
      transition={createStandardTransition(reduceMotion)}
      variants={createFadeMotion(reduceMotion)}
    >
      <m.div
        animate="animate"
        aria-label={t("lobby.playlist.editLabel")}
        aria-modal="true"
        className={chromeStyles.sheet}
        initial={false}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        transition={createStandardTransition(reduceMotion)}
        variants={createSheetMotion(reduceMotion)}
      >
        <div className={chromeStyles.header}>
          <div className={chromeStyles.headerLeft}>
            <h2 className={chromeStyles.title}>{t("lobby.playlist.title")}</h2>
            {!isLoading && (
              <span className={chromeStyles.trackCount}>
                {t("lobby.playlist.trackCount", { count: tracks.length })}
              </span>
            )}
          </div>
          <div className={chromeStyles.headerActions}>
            <CloseIconButton ariaLabel={t("lobby.playlist.close")} onClick={closePlaylistEditor} />
          </div>
        </div>

        <PlaylistSortBar activeField={sortField} direction={sortDir} onToggleSort={toggleSort} />

        {isLoading ? (
          <div className={listStyles.loadingState}>
            <div className={listStyles.loadingSpinner} />
            <span>{t("lobby.playlist.loading")}</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className={listStyles.emptyState}>{t("lobby.playlist.empty")}</div>
        ) : (
          <PlaylistTrackList
            onOpenTrack={(track) => openTrackEditor(track.id)}
            onRemoveTrack={removeTrack}
            onToggleSelection={toggleSelection}
            selectedIds={selectedIds}
            tracks={tracks}
          />
        )}

        {selectedIds.size > 0 && (
          <div className={listStyles.batchToolbar}>
            <ActionButton
              className={listStyles.batchDeleteBtn}
              onClick={removeSelected}
              type="button"
              variant="danger"
            >
              {t("lobby.playlist.remove", { count: selectedIds.size })}
            </ActionButton>
          </div>
        )}

        <PlaylistTrackDetailsSheet
          onClose={closeTrackEditor}
          onSave={updateTrack}
          track={selectedTrack}
        />
      </m.div>
    </m.div>,
    portalTarget,
  );
}

function getSelectedTrackId(
  locationState: Record<string, unknown>,
  historyEntryId: string,
): string | null {
  const entry = locationState[playlistTrackHistoryStateKey];
  if (!isHistoryState(entry) || entry["historyEntryId"] !== historyEntryId) {
    return null;
  }

  return typeof entry["trackId"] === "string" ? entry["trackId"] : null;
}

interface PlaylistSortBarProps {
  activeField: SortField | null;
  direction: "asc" | "desc";
  onToggleSort: (field: SortField) => void;
}

function PlaylistSortBar({ activeField, direction, onToggleSort }: PlaylistSortBarProps) {
  const { t } = useI18n();

  return (
    <div className={listStyles.sortBar}>
      <span className={listStyles.sortLabel}>{t("lobby.playlist.sort")}</span>
      {SORT_FIELDS.map((field) => (
        <button
          key={field}
          className={`${listStyles.sortChip} ${activeField === field ? listStyles.sortChipActive : ""}`}
          onClick={() => onToggleSort(field)}
          type="button"
        >
          {getSortLabel(t, field)}
          {activeField === field && (
            <span className={listStyles.sortArrow}>{direction === "asc" ? "↑" : "↓"}</span>
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
