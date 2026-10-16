import type { PublicTrackInfo, TrackMetadataStatus } from "@tunetrack/shared/client";
import { useCallback, useMemo, useState } from "react";
import {
  filterTracks,
  needsYearCheck,
  type PlaylistEditorFilter,
  type PlaylistEditorSource,
} from "./music/playlistEditorTarget";

/** "original" keeps the deck's own order. */
export type PlaylistSort = "original" | "title" | "artist" | "yearAsc" | "yearDesc";

export const PLAYLIST_SORTS: readonly PlaylistSort[] = [
  "original",
  "title",
  "artist",
  "yearAsc",
  "yearDesc",
];

export interface UsePlaylistEditorResult {
  /** Every song in the deck, whatever the filter shows. */
  allTracks: PublicTrackInfo[];
  clearSelection: () => void;
  filter: PlaylistEditorFilter;
  isLoading: boolean;
  needsCheckCount: number;
  removeSelected: () => void;
  removeTrack: (trackId: string) => void;
  selectedIds: ReadonlySet<string>;
  setFilter: (filter: PlaylistEditorFilter) => void;
  setSort: (sort: PlaylistSort) => void;
  sort: PlaylistSort;
  toggleSelection: (trackId: string) => void;
  /** The songs on screen: filtered, then sorted. */
  tracks: PublicTrackInfo[];
  updateTrack: (trackId: string, patch: PlaylistTrackUpdatePatch) => void;
}

/** What the song details sheet sends: only the fields it sets. */
export interface PlaylistTrackUpdatePatch {
  title?: string;
  artist?: string;
  albumTitle?: string;
  releaseYear?: number;
  metadataStatus?: TrackMetadataStatus;
}

/**
 * Sorting, the Needs check filter and selection over one deck (`22` §4.9). The source decides
 * where the songs live; each opening starts from `initialFilter` with nothing selected.
 */
export function usePlaylistEditor(
  source: PlaylistEditorSource,
  isOpen: boolean,
  initialFilter: PlaylistEditorFilter,
): UsePlaylistEditorResult {
  const [sort, setSort] = useState<PlaylistSort>("original");
  const [filter, setFilter] = useState<PlaylistEditorFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setFilter(initialFilter);
      setSelectedIds(new Set());
      setSort("original");
    }
  }

  const { removeTracks, tracks: allTracks, updateTrack } = source;
  const needsCheckCount = useMemo(() => allTracks.filter(needsYearCheck).length, [allTracks]);

  const tracks = useMemo(() => {
    const shown = filterTracks(allTracks, filter);
    return sort === "original" ? shown : shown.sort((a, b) => compareTracks(a, b, sort));
  }, [allTracks, filter, sort]);

  const removeTrack = useCallback((trackId: string) => removeTracks([trackId]), [removeTracks]);

  const toggleSelection = useCallback((trackId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    removeTracks([...selectedIds]);
    setSelectedIds(new Set());
  }, [removeTracks, selectedIds]);

  return {
    allTracks,
    clearSelection,
    filter,
    isLoading: source.isLoading,
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
  };
}

function compareTracks(a: PublicTrackInfo, b: PublicTrackInfo, sort: PlaylistSort): number {
  switch (sort) {
    case "artist":
      return a.artist.localeCompare(b.artist);
    case "yearAsc":
      return a.releaseYear - b.releaseYear;
    case "yearDesc":
      return b.releaseYear - a.releaseYear;
    default:
      return a.title.localeCompare(b.title);
  }
}
