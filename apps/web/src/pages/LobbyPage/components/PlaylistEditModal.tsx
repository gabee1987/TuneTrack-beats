import { useMemo, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { PanelView } from "../../../features/overlay";
import { classNames } from "../../../features/ui/classNames";
import {
  ChipButton,
  FloatingBar,
  PageHeader,
  SelectionActionBar,
} from "../../../features/ui/primitives";
import type {
  PlaylistEditorFilter,
  PlaylistEditorSource,
} from "../hooks/music/playlistEditorTarget";
import { PLAYLIST_SORTS, usePlaylistEditor, type PlaylistSort } from "../hooks/usePlaylistEditor";
import { PlaylistTrackDetailsSheet } from "./PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "./PlaylistTrackList";
import chromeStyles from "./playlistEditChrome.module.css";
import listStyles from "./playlistEditList.module.css";

interface PlaylistEditModalProps {
  /** Needs check when opened from a "to check" link, otherwise All. */
  initialFilter: PlaylistEditorFilter;
  isOpen: boolean;
  onClose: () => void;
  source: PlaylistEditorSource;
  title: string;
}

export function PlaylistEditModal({
  initialFilter,
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
    setSelectedTrackId(null);
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
    setSort,
    sort,
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
    <PanelView isOpen={isOpen} label={t("lobby.playlist.editLabel")} onDismiss={onClose}>
      <div className={chromeStyles.header}>
        <PageHeader
          backLabel={t("common.back")}
          eyebrow={title}
          meta={isLoading ? undefined : t("lobby.playlist.trackCount", { count: allTracks.length })}
          onBack={onClose}
          title={t("music.editor.heading")}
        />
      </div>

      <FloatingBar className={listStyles.toolbar} edge="top">
        <div aria-label={t("music.filter.label")} className={listStyles.filters} role="group">
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
        <PlaylistSortSelect onChange={setSort} value={sort} />
      </FloatingBar>

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

      <div className={listStyles.batchToolbar}>
        <SelectionActionBar
          actions={[
            {
              label: t("lobby.playlist.remove", { count: selectedIds.size }),
              onClick: removeSelected,
              variant: "danger",
            },
          ]}
          count={selectedIds.size}
        />
      </div>

      <PlaylistTrackDetailsSheet
        onClose={() => setSelectedTrackId(null)}
        onSave={updateTrack}
        track={selectedTrack}
      />
    </PanelView>
  );
}

interface PlaylistSortSelectProps {
  onChange: (sort: PlaylistSort) => void;
  value: PlaylistSort;
}

/**
 * A sort icon over a native select: one tap target in the toolbar, and the phone's own picker
 * for the choice. It turns green while the songs are not in the deck's own order.
 */
function PlaylistSortSelect({ onChange, value }: PlaylistSortSelectProps) {
  const { t } = useI18n();

  return (
    <label
      className={classNames(
        listStyles.sort,
        value === "original" ? undefined : listStyles.sortActive,
      )}
      title={t(`music.sort.${value}`)}
    >
      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path
          d="M7 5v14M7 19l-3-3M7 19l3-3M17 19V5M17 5l-3 3M17 5l3 3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <select
        aria-label={t("music.sort.label")}
        className={listStyles.sortSelect}
        onChange={(event) => onChange(event.target.value as PlaylistSort)}
        value={value}
      >
        {PLAYLIST_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`music.sort.${sort}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
