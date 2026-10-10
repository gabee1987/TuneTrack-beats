import { type CSSProperties, type RefObject, useState } from "react";

/**
 * Keeps the dragged card the size it had in the timeline: measured when the drag starts,
 * released when it ends.
 */
export function useDragOverlaySize(previewCardElementRef: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ height: number; width: number } | null>(null);

  function captureDragOverlaySize() {
    const previewNode = previewCardElementRef.current;
    if (!previewNode) {
      return;
    }

    const previewRect = previewNode.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
      return;
    }

    setSize({ height: previewRect.height, width: previewRect.width });
  }

  const dragOverlayStyle = size
    ? ({
        width: size.width,
        height: size.height,
        ["--timeline-card-width" as string]: `${size.width}px`,
        ["--timeline-card-height" as string]: `${size.height}px`,
      } as CSSProperties)
    : undefined;

  return {
    captureDragOverlaySize,
    clearDragOverlaySize: () => setSize(null),
    dragOverlayStyle,
  };
}
