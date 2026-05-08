import { useVirtualizer } from "@tanstack/react-virtual";
import type { PublicTrackInfo } from "@tunetrack/shared";
import { useRef } from "react";
import { PlaylistTrackRow } from "./PlaylistTrackRow";
import styles from "./PlaylistEditModal.module.css";

interface PlaylistTrackListProps {
  isSelectMode: boolean;
  onOpenTrack: (track: PublicTrackInfo) => void;
  onRemoveTrack: (trackId: string) => void;
  onToggleSelection: (trackId: string) => void;
  selectedIds: ReadonlySet<string>;
  tracks: PublicTrackInfo[];
}

export function PlaylistTrackList({
  isSelectMode,
  onOpenTrack,
  onRemoveTrack,
  onToggleSelection,
  selectedIds,
  tracks,
}: PlaylistTrackListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 68,
    overscan: 10,
  });

  return (
    <div className={styles.listScrollArea} ref={listRef}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const track = tracks[virtualItem.index];
          if (!track) return null;
          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <PlaylistTrackRow
                key={track.id}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(track.id)}
                onOpen={onOpenTrack}
                onRemove={onRemoveTrack}
                onToggleSelect={onToggleSelection}
                track={track}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
