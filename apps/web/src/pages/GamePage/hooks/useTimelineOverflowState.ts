import { useEffect, useState } from "react";

interface UseTimelineOverflowStateOptions {
  itemCount: number;
  timelineRowRef: React.RefObject<HTMLDivElement | null>;
}

function hasOverflow(rowElement: HTMLElement): boolean {
  const isGridLayout = getComputedStyle(rowElement).display === "grid";

  return isGridLayout
    ? rowElement.scrollHeight - rowElement.clientHeight > 4
    : rowElement.scrollWidth - rowElement.clientWidth > 4;
}

/**
 * One `ResizeObserver` for the panel's lifetime. A reorder cannot change the overflow, so
 * only a change in the item count re-measures (05 C3).
 */
export function useTimelineOverflowState({
  itemCount,
  timelineRowRef,
}: UseTimelineOverflowStateOptions) {
  const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);

  useEffect(() => {
    const rowElement = timelineRowRef.current;

    if (!rowElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setHasTimelineOverflow(hasOverflow(rowElement));
    });

    resizeObserver.observe(rowElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [timelineRowRef]);

  useEffect(() => {
    const rowElement = timelineRowRef.current;

    if (rowElement) {
      setHasTimelineOverflow(hasOverflow(rowElement));
    }
  }, [itemCount, timelineRowRef]);

  return hasTimelineOverflow;
}
