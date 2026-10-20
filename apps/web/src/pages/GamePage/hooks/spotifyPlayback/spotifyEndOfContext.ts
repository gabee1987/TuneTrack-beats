const END_OF_CONTEXT_TOLERANCE_MS = 1_000;

/**
 * A single-URI context that has run out has nothing left to resume: `player.resume()` is a
 * no-op there, and only re-issuing the URI produces audio again. Spotify reports the
 * exhausted context in two shapes depending on SDK version — paused back at the start, or
 * paused at the end — and both leave the queue empty.
 *
 * Leaning towards `true` is deliberate. A false positive costs a restart where a resume
 * would have done; a false negative leaves the host with a dead play button.
 */
export function isEndOfContext(state: Spotify.PlaybackState): boolean {
  if (!state.paused || state.track_window.next_tracks.length > 0) {
    return false;
  }

  const isBackAtStart = state.position <= END_OF_CONTEXT_TOLERANCE_MS;
  const isAtEnd =
    state.duration > 0 && state.position >= state.duration - END_OF_CONTEXT_TOLERANCE_MS;

  return isBackAtStart || isAtEnd;
}
