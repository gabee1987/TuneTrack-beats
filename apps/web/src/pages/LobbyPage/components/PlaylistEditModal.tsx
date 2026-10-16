import { useMemo, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { PanelView } from "../../../features/overlay";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { ChipButton } from "../../../features/ui/primitives";
import type {
  PlaylistEditorFilter,
  PlaylistEditorSource,
} from "../hooks/music/playlistEditorTarget";
import { usePlaylistEditor, type SortField } from "../hooks/usePlaylistEditor";
import { PlaylistTrackDetailsSheet } from "./PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "./PlaylistTrackList";
import chromeStyles from "./playlistEditChrome.module.css";
import listStyles from "./playlistEditList.module.css";

interface PlaylistEditModalProps {
  /** Needs check when opened from a "to check" link, otherwise All. */
  initialFilter: PlaylistEditorFilter;
  /** A song to open in the details sheet straight away. */
  initialTrackId?: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  source: PlaylistEditorSource;
  title: string;
}

const SORT_FIELDS: SortField[] = ["title", "artist", "year"];

export function PlaylistEditModal({
  initialFilter,
  initialTrackId,
  isOpen,
  onClose,
  source,
  title,
}: PlaylistEditModalProps) {
  const { t } = useI18n();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    setSelectedTrackId(isOpen ? (initialTrackId ?? null) : null);
  }

  const {
    allTracks,
    filter,
    isLoading,
    needsCheckCount,
    removeSelected,
    removeTrack,
    selectedIds,
    setFilter,
    sortDir,
    sortField,
    toggleSort,
    toggleSelection,
    tracks,
    updateTrack,
  } = usePlaylistEditor(source, isOpen, initialFilter);

  // Looked up in every song: a checked song leaves the Needs check list while its sheet is open.
  const selectedTrack = useMemo(
    () => allTracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, allTracks],
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
          <h2 className={chromeStyles.title}>{title}</h2>
          {!isLoading && (
            <span className={chromeStyles.trackCount}>
              {t("lobby.playlist.trackCount", { count: allTracks.length })}
            </span>
          )}
        </div>
        <div className={chromeStyles.headerActions}>
          <CloseIconButton ariaLabel={t("lobby.playlist.close")} onClick={onClose} />
        </div>
      </div>

      <div className={listStyles.filterBar} role="group" aria-label={t("music.filter.label")}>
        <ChipButton
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
          selected={filter === "all"}
        >
          {t("music.filter.all", { count: allTracks.length })}
        </ChipButton>
        <ChipButton
          aria-pressed={filter === "needsCheck"}
          onClick={() => setFilter("needsCheck")}
          selected={filter === "needsCheck"}
        >
          {t("music.filter.needsCheck", { count: needsCheckCount })}
        </ChipButton>
      </div>
      <PlaylistSortBar activeField={sortField} direction={sortDir} onToggleSort={toggleSort} />

      {isLoading ? (
        <div className={listStyles.loadingState}>
          <div className={listStyles.loadingSpinner} />
          <span>{t("lobby.playlist.loading")}</span>
        </div>
      ) : tracks.length === 0 ? (
        <div className={listStyles.emptyState}>
          {filter === "needsCheck" && allTracks.length > 0
            ? t("music.filter.noneToCheck")
            : t("lobby.playlist.empty")}
        </div>
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
