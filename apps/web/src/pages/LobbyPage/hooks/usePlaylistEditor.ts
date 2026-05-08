import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlaylistTracksPayload,
  type PublicTrackInfo,
  type TrackMetadataStatus,
} from "@tunetrack/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocketClient } from "../../../services/socket/socketClient";

export type SortField = "title" | "artist" | "year";
export type SortDir = "asc" | "desc";

export interface UsePlaylistEditorResult {
  error: string | null;
  isLoading: boolean;
  isSelectMode: boolean;
  removeSelected: () => void;
  removeTrack: (trackId: string) => void;
  selectedIds: ReadonlySet<string>;
  setSelectMode: (on: boolean) => void;
  sortDir: SortDir;
  sortField: SortField | null;
  toggleSort: (field: SortField) => void;
  toggleSelection: (trackId: string) => void;
  tracks: PublicTrackInfo[];
  updateTrack: (trackId: string, patch: PlaylistTrackUpdatePatch) => void;
}

export interface PlaylistTrackUpdatePatch {
  title?: string;
  artist?: string;
  albumTitle?: string;
  releaseYear?: number;
  metadataStatus?: TrackMetadataStatus;
}

export function usePlaylistEditor(isOpen: boolean): UsePlaylistEditorResult {
  const { roomId } = useParams<{ roomId: string }>();

  const [rawTracks, setRawTracks] = useState<PublicTrackInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [isSelectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !roomId) return;

    setIsLoading(true);
    setError(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    setSortField(null);

    // `active` guards against the promise resolving after cleanup, which would
    // permanently attach a listener that can never be removed.
    let active = true;
    let off: (() => void) | null = null;

    void getSocketClient().then((socket) => {
      if (!active) return;

      function handleTracks(payload: PlaylistTracksPayload) {
        setRawTracks(payload.tracks);
        setIsLoading(false);
      }

      socket.on(ServerToClientEvent.PlaylistTracks, handleTracks);
      socket.emit(ClientToServerEvent.GetPlaylistTracks, { roomId });

      off = () => socket.off(ServerToClientEvent.PlaylistTracks, handleTracks);
    });

    return () => {
      active = false;
      off?.();
    };
  }, [isOpen, roomId]);

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

  const tracks = useMemo(() => {
    if (!sortField) return rawTracks;
    return [...rawTracks].sort((a, b) => {
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
  }, [rawTracks, sortField, sortDir]);

  const removeTrack = useCallback(
    (trackId: string) => {
      if (!roomId) return;
      setRawTracks((prev) => prev.filter((t) => t.id !== trackId));
      void getSocketClient().then((socket) => {
        socket.emit(ClientToServerEvent.RemovePlaylistTracks, { roomId, trackIds: [trackId] });
      });
    },
    [roomId],
  );

  const toggleSelection = useCallback((trackId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const removeSelected = useCallback(() => {
    if (!roomId || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setRawTracks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    void getSocketClient().then((socket) => {
      socket.emit(ClientToServerEvent.RemovePlaylistTracks, { roomId, trackIds: ids });
    });
  }, [roomId, selectedIds]);

  const updateTrack = useCallback(
    (trackId: string, patch: PlaylistTrackUpdatePatch) => {
      if (!roomId) return;

      setRawTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                ...patch,
                sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
                metadataStatus: patch.metadataStatus ?? track.metadataStatus,
              }
            : track,
        ),
      );

      void getSocketClient().then((socket) => {
        socket.emit(ClientToServerEvent.UpdatePlaylistTrack, {
          roomId,
          trackId,
          ...patch,
        });
      });
    },
    [roomId],
  );

  return {
    error,
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
  };
}
