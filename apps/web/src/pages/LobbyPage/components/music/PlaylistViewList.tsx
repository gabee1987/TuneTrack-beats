import { useVirtualizer } from "@tanstack/react-virtual";
import type { PublicTrackInfo } from "@tunetrack/shared/client";
import { useCallback, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { ListReorderSlot } from "../../../../features/motion";
import { classNames } from "../../../../features/ui/classNames";
import { Chip, ListRow, ListRowAction } from "../../../../features/ui/primitives";
import { resolveArtworkUrl } from "../../../../features/ui/resolveArtworkUrl";
import { needsYearCheck } from "../../hooks/music/playlistEditorTarget";
import type { PlaylistGameMembership } from "../../hooks/music/usePlaylistView";
import { SelectableArtwork, SelectableArtworkImage } from "../SelectableArtwork";
import { CheckGlyph } from "./musicGlyphs";
import { SongSwipe } from "./SongSwipe";
import styles from "./playlistView.module.css";

const ROW_HEIGHT_PX = 64;

interface PlaylistViewListProps {
  membership: PlaylistGameMembership | null;
  onOpenTrack: (trackId: string) => void;
  /** A deck's or quick pick's swipe left deletes the song from the list. */
  onRemoveTrack: (trackId: string) => void;
  onToggleSelection: (trackId: string) => void;
  /** The view's scroller, shared with the cover above the list. */
  scrollElement: HTMLDivElement | null;
  selectedIds: ReadonlySet<string>;
  tracks: readonly PublicTrackInfo[];
}

/** Long decks stay light: only the rows on screen are drawn, and a new order slides into place. */
export function PlaylistViewList({
  membership,
  onOpenTrack,
  onRemoveTrack,
  onToggleSelection,
  scrollElement,
  selectedIds,
  tracks,
}: PlaylistViewListProps) {
  // The list starts below the cover and the toolbar inside the same scroller.
  const [listOffset, setListOffset] = useState(0);
  const measureOffset = useCallback((node: HTMLDivElement | null) => {
    if (node) setListOffset(node.offsetTop);
  }, []);
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    estimateSize: () => ROW_HEIGHT_PX,
    getItemKey: (index) => tracks[index]?.id ?? index,
    getScrollElement: () => scrollElement,
    overscan: 10,
    scrollMargin: listOffset,
  });

  return (
    <div
      className={styles.list}
      ref={measureOffset}
      style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
    >
      {rowVirtualizer.getVirtualItems().map((item) => {
        const track = tracks[item.index];
        if (!track) return null;
        const row = (
          <PlaylistViewRow
            isInGame={membership?.isInGame(track.id) ?? null}
            isSelected={selectedIds.has(track.id)}
            onOpen={() => onOpenTrack(track.id)}
            onToggleGame={
              membership
                ? () => {
                    if (membership.isInGame(track.id)) membership.remove(new Set([track.id]));
                    else membership.add(new Set([track.id]));
                  }
                : undefined
            }
            onToggleSelection={() => onToggleSelection(track.id)}
            track={track}
          />
        );
        return (
          <ListReorderSlot
            className={styles.rowSlot}
            key={item.key}
            offset={item.start - listOffset}
          >
            {membership ? (
              <SongSwipe
                isInGame={membership.isInGame(track.id)}
                onAdd={() => membership.add(new Set([track.id]))}
                onRemoveFromGame={() => membership.remove(new Set([track.id]))}
              >
                {row}
              </SongSwipe>
            ) : (
              <SongSwipe onDelete={() => onRemoveTrack(track.id)}>{row}</SongSwipe>
            )}
          </ListReorderSlot>
        );
      })}
    </div>
  );
}

interface PlaylistViewRowProps {
  /** `null` on a deck, where every song is the deck's own. */
  isInGame: boolean | null;
  isSelected: boolean;
  onOpen: () => void;
  onToggleGame: (() => void) | undefined;
  onToggleSelection: () => void;
  track: PublicTrackInfo;
}

/** A tap on the cover selects, a tap on the text opens the song, Add puts it in the game. */
function PlaylistViewRow({
  isInGame,
  isSelected,
  onOpen,
  onToggleGame,
  onToggleSelection,
  track,
}: PlaylistViewRowProps) {
  const { t } = useI18n();
  const artworkUrl = resolveArtworkUrl(track);

  return (
    <ListRow
      className={classNames(styles.row, isSelected ? styles.rowSelected : undefined)}
      isLeadingSeparate
      leading={
        <SelectableArtwork
          ariaLabel={t("lobby.playlist.toggleSelection", { title: track.title })}
          isSelected={isSelected}
          onToggle={onToggleSelection}
        >
          {artworkUrl ? <SelectableArtworkImage src={artworkUrl} /> : <MusicNoteIcon />}
        </SelectableArtwork>
      }
      onOpen={onOpen}
      subtitle={`${track.artist} · ${track.releaseYear}`}
      title={track.title}
      trailing={
        <span className={styles.rowTrailing}>
          {needsYearCheck(track) ? (
            <Chip className={styles.checkYear}>{t("lobby.playlist.statusCheck")}</Chip>
          ) : null}
          {track.metadataStatus === "verified" ? (
            <span
              aria-label={t("lobby.playlist.statusVerified")}
              className={styles.yearChecked}
              role="img"
              title={t("lobby.playlist.statusVerified")}
            >
              <CheckGlyph />
            </span>
          ) : null}
          {onToggleGame ? (
            <ListRowAction
              aria-label={t("music.find.addLabel", { title: track.title })}
              kind={isInGame ? "added" : "add"}
              onClick={onToggleGame}
            />
          ) : null}
        </span>
      }
    />
  );
}

function MusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={18} viewBox="0 0 24 24" width={18}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
