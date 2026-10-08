import { useMemo, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { PanelView } from "../../../features/overlay";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
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

export function PlaylistEditModal({ isOpen, onClose }: PlaylistEditModalProps) {
  const { t } = useI18n();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  if (!isOpen && selectedTrackId !== null) {
    setSelectedTrackId(null);
  }

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

  return (
    // A view inside Music Setup, not a sheet on top of it (`PanelView`).
    <PanelView
      className={chromeStyles.sheet}
      isOpen={isOpen}
      label={t("lobby.playlist.editLabel")}
      onDismiss={onClose}
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
          <CloseIconButton ariaLabel={t("lobby.playlist.close")} onClick={onClose} />
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
          onOpenTrack={(track) => setSelectedTrackId(track.id)}
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
        onClose={() => setSelectedTrackId(null)}
        onSave={updateTrack}
        track={selectedTrack}
      />
    </PanelView>
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
