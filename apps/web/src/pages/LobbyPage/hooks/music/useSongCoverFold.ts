import { useEffect, useState } from "react";
import { useCollapsingHeader } from "../../../../features/motion";

/** About the cover's height on a phone: by then the small cover has taken its place in the bar. */
const SONG_COVER_FOLD_PX = 280;

/**
 * A song's own view (the Song editor, Find's song details): the full-width cover folds into the
 * bar as the details scroll up. The next song in a review starts at the top again.
 */
export function useSongCoverFold(songId: string | null) {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const collapse = useCollapsingHeader(scrollElement, SONG_COVER_FOLD_PX);

  useEffect(() => {
    if (scrollElement) scrollElement.scrollTop = 0;
  }, [scrollElement, songId]);

  return { collapse, scrollRef: setScrollElement };
}
