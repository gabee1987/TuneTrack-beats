import { useVirtualizer } from "@tanstack/react-virtual";
import type { PublicTrackInfo } from "@tunetrack/shared";
import { motion } from "framer-motion";
import { useRef } from "react";
import { PlaylistTrackRow } from "./PlaylistTrackRow";
import styles from "./playlistEditModalStyles";

interface PlaylistTrackListProps {
  canSelect?: boolean;
  onOpenTrack: (track: PublicTrackInfo) => void;
  onRemoveTrack: (trackId: string) => void;
  onToggleSelection: (trackId: string) => void;
  selectedIds: ReadonlySet<string>;
  tracks: PublicTrackInfo[];
}

export function PlaylistTrackList({
  canSelect = true,
  onOpenTrack,
  onRemoveTrack,
  onToggleSelection,
  selectedIds,
  tracks,
}: PlaylistTrackListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getItemKey: (index) => tracks[index]?.id ?? index,
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
            <motion.div
              animate={{ y: virtualItem.start }}
              initial={false}
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
              }}
              transition={{ type: "spring", stiffness: 420, damping: 42, mass: 0.9 }}
            >
              <PlaylistTrackRow
                canSelect={canSelect}
                isSelected={selectedIds.has(track.id)}
                onOpen={onOpenTrack}
                onRemove={onRemoveTrack}
                onToggleSelect={onToggleSelection}
                track={track}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
