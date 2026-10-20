import {
  ClientToServerEvent,
  ServerToClientEvent,
  applyTrackEdit,
  type PlaylistTrackUpdatedPayload,
  type PlaylistTracksPayload,
  type PublicTrackInfo,
  type TrackEditPatch,
} from "@tunetrack/shared/client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { PlaylistEditorSource } from "./playlistEditorTarget";

/**
 * The room deck's songs while `isActive`, asked for again whenever `deckKey` changes (a new
 * deck or a different song count). Edits and removals show at once and go to the server,
 * whose answer replaces the optimistic copy.
 */
export function useRoomDeckTracks(isActive: boolean, deckKey: string): PlaylistEditorSource {
  const { roomId } = useParams<{ roomId: string }>();
  const [tracks, setTracks] = useState<PublicTrackInfo[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isActive || !roomId) return;

    // `active` guards against the promise resolving after cleanup, which would
    // permanently attach a listener that can never be removed.
    let active = true;
    let off: (() => void) | null = null;

    void getSocketClient().then((socket) => {
      if (!active) return;

      function handleTracks(payload: PlaylistTracksPayload) {
        setTracks(payload.tracks);
        setHasLoaded(true);
      }

      function handleTrackUpdated({ track }: PlaylistTrackUpdatedPayload) {
        setTracks((current) => current.map((item) => (item.id === track.id ? track : item)));
      }

      socket.on(ServerToClientEvent.PlaylistTracks, handleTracks);
      socket.on(ServerToClientEvent.PlaylistTrackUpdated, handleTrackUpdated);
      socket.emit(ClientToServerEvent.GetPlaylistTracks, { roomId });

      off = () => {
        socket.off(ServerToClientEvent.PlaylistTracks, handleTracks);
        socket.off(ServerToClientEvent.PlaylistTrackUpdated, handleTrackUpdated);
      };
    });

    return () => {
      active = false;
      off?.();
    };
  }, [deckKey, isActive, roomId]);

  const removeTracks = useCallback(
    (trackIds: readonly string[]) => {
      if (!roomId || trackIds.length === 0) return;
      setTracks((current) => current.filter((track) => !trackIds.includes(track.id)));
      void getSocketClient().then((socket) => {
        socket.emit(ClientToServerEvent.RemovePlaylistTracks, { roomId, trackIds: [...trackIds] });
      });
    },
    [roomId],
  );

  const updateTrack = useCallback(
    (trackId: string, patch: TrackEditPatch) => {
      if (!roomId) return;
      setTracks((current) =>
        current.map((track) => (track.id === trackId ? applyTrackEdit(track, patch) : track)),
      );
      void getSocketClient().then((socket) => {
        socket.emit(ClientToServerEvent.UpdatePlaylistTrack, { roomId, trackId, ...patch });
      });
    },
    [roomId],
  );

  return { isLoading: isActive && !hasLoaded, removeTracks, tracks, updateTrack };
}
