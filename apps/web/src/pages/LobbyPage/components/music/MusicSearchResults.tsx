import type { SpotifyPlaylistSearchItem, SpotifySmartSearchResult } from "@tunetrack/shared/client";
import { useState } from "react";
import { useI18n } from "../../../../features/i18n";
import {
  Button,
  CoverArt,
  ListRow,
  ListRowAction,
  ListRowButton,
  ListSkeleton,
} from "../../../../features/ui/primitives";
import type { MusicFindState } from "../../hooks/music/useMusicFind";
import { ChevronGlyph, CheckGlyph } from "./musicGlyphs";
import { MusicSongDetails } from "./MusicSongDetails";
import styles from "./music.module.css";
import findStyles from "./musicFind.module.css";

interface MusicSearchResultsProps {
  disabled: boolean;
  find: MusicFindState;
  onOpen: (result: SpotifySmartSearchResult) => void;
}

/** Songs add in place; albums, artists and playlists open their songs (`22` §4.8, Find). */
export function MusicSearchResults({ disabled, find, onOpen }: MusicSearchResultsProps) {
  const { t } = useI18n();
  const { results } = find;
  const [detailsSong, setDetailsSong] = useState<SpotifySmartSearchResult | null>(null);

  if (find.isSearching) {
    return <ListSkeleton count={3} leading="cover-sm" trailing="action" />;
  }
  if (find.searchError) {
    return (
      <p className={styles.errorLine} role="alert">
        {find.searchError}
      </p>
    );
  }
  if (find.resultCount === 0) {
    return find.hasSearched ? (
      <p className={styles.statusLine} role="status">
        {t("music.find.noResults", { query: find.query.trim() })}
      </p>
    ) : null;
  }

  const hasSongs =
    results.kind === "music" && results.results.some((result) => result.type === "track");

  return (
    <section aria-label={t("music.find.results")} className={findStyles.results}>
      {hasSongs ? (
        <div className={findStyles.resultsHeader}>
          <Button
            onClick={find.isSelecting ? find.endSelection : find.startSelection}
            variant="tertiary"
          >
            {find.isSelecting ? t("music.find.selectDone") : t("music.find.select")}
          </Button>
        </div>
      ) : null}
      <ul className={findStyles.resultList}>
        {results.kind === "playlists"
          ? results.playlists.map((playlist) => (
              <li key={playlist.id}>
                <PlaylistRow
                  disabled={disabled}
                  onOpen={() => onOpen(toOpenableResult(playlist))}
                  playlist={playlist}
                />
              </li>
            ))
          : results.results.map((result) => (
              <li key={`${result.type}:${result.id}`}>
                <MusicResultRow
                  disabled={disabled}
                  find={find}
                  onDetails={setDetailsSong}
                  onOpen={onOpen}
                  result={result}
                />
              </li>
            ))}
      </ul>
      {find.hasMore ? (
        <Button
          disabled={disabled}
          fullWidth
          isLoading={find.isLoadingMore}
          onClick={find.loadMore}
          variant="secondary"
        >
          {t("music.find.loadMore")}
        </Button>
      ) : null}
      <MusicSongDetails
        disabled={disabled}
        isAdded={detailsSong ? find.queued.has(detailsSong.id) : false}
        onClose={() => setDetailsSong(null)}
        onToggle={find.toggleTrack}
        song={detailsSong}
      />
    </section>
  );
}

interface MusicResultRowProps {
  disabled: boolean;
  find: MusicFindState;
  onDetails: (song: SpotifySmartSearchResult) => void;
  onOpen: (result: SpotifySmartSearchResult) => void;
  result: SpotifySmartSearchResult;
}

function MusicResultRow({ disabled, find, onDetails, onOpen, result }: MusicResultRowProps) {
  const { t } = useI18n();
  const cover = <CoverArt label={result.title} size="sm" src={result.imageUrl} />;
  const subtitle = getResultSubtitle(result);

  if (result.type !== "track") {
    return (
      <ListRowButton
        disabled={disabled}
        leading={cover}
        onClick={() => onOpen(result)}
        subtitle={subtitle}
        title={result.title}
        trailing={<ChevronGlyph className={styles.chevron} />}
      />
    );
  }

  if (find.isSelecting) {
    const isSelected = find.selectedIds.has(result.id);
    return (
      <ListRowButton
        aria-pressed={isSelected}
        className={isSelected ? findStyles.selectedRow : undefined}
        disabled={disabled}
        leading={cover}
        onClick={() => find.toggleSelected(result.id)}
        subtitle={subtitle}
        title={result.title}
        trailing={
          <span aria-hidden="true" className={findStyles.selectMark} data-selected={isSelected}>
            {isSelected ? <CheckGlyph /> : null}
          </span>
        }
      />
    );
  }

  const isAdded = find.queued.has(result.id);
  return (
    <ListRow
      leading={cover}
      onOpen={() => onDetails(result)}
      subtitle={subtitle}
      title={result.title}
      trailing={
        <ListRowAction
          aria-label={t("music.find.addLabel", { title: result.title })}
          disabled={disabled}
          kind={isAdded ? "added" : "add"}
          onClick={() => find.toggleTrack(result)}
        />
      }
    />
  );
}

function PlaylistRow({
  disabled,
  onOpen,
  playlist,
}: {
  disabled: boolean;
  onOpen: () => void;
  playlist: SpotifyPlaylistSearchItem;
}) {
  const { t } = useI18n();

  return (
    <ListRowButton
      disabled={disabled}
      leading={<CoverArt label={playlist.name} size="sm" src={playlist.imageUrl} />}
      onClick={onOpen}
      subtitle={t("music.find.playlistSubtitle", {
        count: playlist.trackCount,
        owner: playlist.ownerName,
      })}
      title={playlist.name}
      trailing={<ChevronGlyph className={styles.chevron} />}
    />
  );
}

function getResultSubtitle(result: SpotifySmartSearchResult): string {
  if (result.type === "track" && result.artist && result.releaseYear) {
    return `${result.artist} · ${result.releaseYear}`;
  }
  return result.subtitle;
}

/** A found playlist opens through the same view as an album or an artist. */
function toOpenableResult(playlist: SpotifyPlaylistSearchItem): SpotifySmartSearchResult {
  return {
    id: playlist.id,
    subtitle: playlist.ownerName,
    title: playlist.name,
    trackCount: playlist.trackCount,
    type: "playlist",
    ...(playlist.imageUrl ? { imageUrl: playlist.imageUrl } : {}),
  };
}
