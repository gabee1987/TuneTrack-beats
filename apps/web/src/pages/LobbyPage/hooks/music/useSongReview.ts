import { useState } from "react";

/** Review flagged (`22` §4.9): the song's place in the run and the step to the next one. */
export interface SongReview {
  count: number;
  index: number;
  onNext: () => void;
}

/**
 * Which song the Song editor shows: one opened from its row, or a run through the flagged
 * songs in the order the list showed them when the review began (`22` §4.9, Review flagged).
 */
export function useSongReview() {
  const [run, setRun] = useState<readonly string[] | null>(null);
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);
  const index = run && openTrackId ? run.indexOf(openTrackId) : -1;

  const review: SongReview | undefined =
    run && index >= 0
      ? {
          count: run.length,
          index: index + 1,
          onNext: () => {
            const next = run[index + 1] ?? null;
            if (!next) setRun(null);
            setOpenTrackId(next);
          },
        }
      : undefined;

  return {
    close: () => {
      setRun(null);
      setOpenTrackId(null);
    },
    open: (trackId: string) => {
      setRun(null);
      setOpenTrackId(trackId);
    },
    openTrackId,
    review,
    start: (trackIds: readonly string[]) => {
      setRun(trackIds);
      setOpenTrackId(trackIds[0] ?? null);
    },
  };
}
