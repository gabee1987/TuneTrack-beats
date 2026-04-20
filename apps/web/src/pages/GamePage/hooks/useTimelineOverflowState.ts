import { useEffect, useState } from "react";

interface UseTimelineOverflowStateOptions {
  dependencyKey: unknown;
  timelineRowRef: React.RefObject<HTMLDivElement | null>;
}

export function useTimelineOverflowState({
  dependencyKey,
  timelineRowRef,
}: UseTimelineOverflowStateOptions) {
  const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);

  useEffect(() => {
    if (!timelineRowRef.current) {
      return;
    }

    const rowElement = timelineRowRef.current;

    function updateOverflowState() {
      const isGridLayout = getComputedStyle(rowElement).display === "grid";

      setHasTimelineOverflow(
        isGridLayout
          ? rowElement.scrollHeight - rowElement.clientHeight > 4
          : rowElement.scrollWidth - rowElement.clientWidth > 4,
      );
    }

    updateOverflowState();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflowState();
    });

    resizeObserver.observe(rowElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [dependencyKey, timelineRowRef]);

  return hasTimelineOverflow;
}
