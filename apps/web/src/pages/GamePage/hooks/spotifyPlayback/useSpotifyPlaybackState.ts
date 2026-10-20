import { useCallback, useRef, useState, type MutableRefObject } from "react";
import { isEndOfContext } from "./spotifyEndOfContext";

export interface SpotifyPlaybackSnapshot {
  isPlaying: boolean;
  /** Position at `positionUpdatedAtMs`; the playback tab interpolates between snapshots. */
  position: number;
  positionUpdatedAtMs: number;
  duration: number;
  hasActiveContext: boolean;
  hasEnded: boolean;
  /** The track the device actually holds, which is not always the one the room wants. */
  currentTrackUri: string | null;
  /** An autoplay block is pending; only a real user gesture can lift it. */
  needsUserGesture: boolean;
}

export interface SpotifyPlaybackState {
  snapshot: SpotifyPlaybackSnapshot;
  /** Read by a play attempt in the same tick, before the state update has landed. */
  isPlayingRef: MutableRefObject<boolean>;
  currentTrackUriRef: MutableRefObject<string | null>;
  needsUserGestureRef: MutableRefObject<boolean>;
  applyPlayerState: (state: Spotify.PlaybackState) => void;
  setNeedsUserGestureFlag: (value: boolean) => void;
  clearEnded: () => void;
  markPaused: () => void;
  resetPlaybackState: () => void;
}

/** What the Spotify device last reported, mirrored into React state for rendering. */
export function useSpotifyPlaybackState(): SpotifyPlaybackState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [positionUpdatedAtMs, setPositionUpdatedAtMs] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasActiveContext, setHasActiveContext] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [currentTrackUri, setCurrentTrackUri] = useState<string | null>(null);

  const isPlayingRef = useRef(false);
  const currentTrackUriRef = useRef<string | null>(null);
  const needsUserGestureRef = useRef(false);

  const setNeedsUserGestureFlag = useCallback((value: boolean) => {
    needsUserGestureRef.current = value;
    setNeedsUserGesture(value);
  }, []);

  const applyPlayerState = useCallback(
    (state: Spotify.PlaybackState) => {
      const playing = !state.paused;
      const trackUri = state.track_window.current_track?.uri ?? null;
      const ended = isEndOfContext(state);
      if (playing) {
        setNeedsUserGestureFlag(false);
      }
      currentTrackUriRef.current = trackUri;
      setCurrentTrackUri(trackUri);
      setIsPlaying(playing);
      setHasEnded(ended);
      // The flag now means what its name says. It stayed true for the life of the player
      // before, so an exhausted context still looked resumable and the host's play button
      // did nothing at all.
      setHasActiveContext(!ended);
      isPlayingRef.current = playing;
      setPosition(state.position);
      setPositionUpdatedAtMs(Date.now());
      setDuration(state.duration);
    },
    [setNeedsUserGestureFlag],
  );

  const clearEnded = useCallback(() => setHasEnded(false), []);

  const markPaused = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const resetPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setHasActiveContext(false);
    setHasEnded(false);
    setNeedsUserGestureFlag(false);
    isPlayingRef.current = false;
    setPositionUpdatedAtMs(0);
    currentTrackUriRef.current = null;
    setCurrentTrackUri(null);
  }, [setNeedsUserGestureFlag]);

  return {
    snapshot: {
      isPlaying,
      position,
      positionUpdatedAtMs,
      duration,
      hasActiveContext,
      hasEnded,
      currentTrackUri,
      needsUserGesture,
    },
    isPlayingRef,
    currentTrackUriRef,
    needsUserGestureRef,
    applyPlayerState,
    setNeedsUserGestureFlag,
    clearEnded,
    markPaused,
    resetPlaybackState,
  };
}
