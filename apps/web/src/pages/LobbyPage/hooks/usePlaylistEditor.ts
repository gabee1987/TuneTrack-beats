import type { PublicTrackInfo, TrackMetadataStatus } from "@tunetrack/shared/client";
import { useCallback, useMemo, useState } from "react";
import {
  filterTracks,
  needsYearCheck,
  type PlaylistEditorFilter,
  type PlaylistEditorSource,
} from "./music/playlistEditorTarget";

export type SortField = "title" | "artist" | "year";
export type SortDir = "asc" | "desc";

export interface UsePlaylistEditorResult {
  /** Every song in the deck, whatever the filter shows. */
  allTracks: PublicTrackInfo[];
  filter: PlaylistEditorFilter;
  isLoading: boolean;
  needsCheckCount: number;
  removeSelected: () => void;
  removeTrack: (trackId: string) => void;
  selectedIds: ReadonlySet<string>;
  setFilter: (filter: PlaylistEditorFilter) => void;
  sortDir: SortDir;
  sortField: SortField | null;
  toggleSort: (field: SortField) => void;
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
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<PlaylistEditorFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setFilter(initialFilter);
      setSelectedIds(new Set());
      setSortField(null);
    }
  }

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  const { removeTracks, tracks: allTracks, updateTrack } = source;
  const needsCheckCount = useMemo(() => allTracks.filter(needsYearCheck).length, [allTracks]);

  const tracks = useMemo(() => {
    const shown = filterTracks(allTracks, filter);
    if (!sortField) return shown;
    return shown.sort((a, b) => {
      let cmp: number;
      if (sortField === "year") {
        cmp = a.releaseYear - b.releaseYear;
      } else if (sortField === "artist") {
        cmp = a.artist.localeCompare(b.artist);
      } else {
        cmp = a.title.localeCompare(b.title);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allTracks, filter, sortField, sortDir]);

  const removeTrack = useCallback((trackId: string) => removeTracks([trackId]), [removeTracks]);

  const toggleSelection = useCallback((trackId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    removeTracks([...selectedIds]);
    setSelectedIds(new Set());
  }, [removeTracks, selectedIds]);

  return {
    allTracks,
    filter,
    isLoading: source.isLoading,
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
  };
}
