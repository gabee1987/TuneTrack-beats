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
import { SelectableArtwork, SelectableArtworkImage } from "../SelectableArtwork";
import { SpotifyLogo } from "../spotify/spotifySetupIcons";
import { ChevronGlyph } from "./musicGlyphs";
import { MusicSongDetails } from "./MusicSongDetails";
import styles from "./music.module.css";
import findStyles from "./musicFind.module.css";

interface MusicSearchResultsProps {
  disabled: boolean;
  find: MusicFindState;
  onOpen: (result: SpotifySmartSearchResult) => void;
}

/**
 * Songs add in place, a tap on a cover selects, a tap on the text opens the song; albums,
 * artists and playlists open their songs (`22` §4.8, Find).
 */
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

  return (
    <section aria-label={t("music.find.results")} className={findStyles.results}>
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
  const subtitle = getResultSubtitle(result);

  if (result.type !== "track") {
    return (
      <ListRowButton
        disabled={disabled}
        leading={<CoverArt label={result.title} size="sm" src={result.imageUrl} />}
        onClick={() => onOpen(result)}
        subtitle={subtitle}
        title={result.title}
        trailing={<ChevronGlyph className={styles.chevron} />}
      />
    );
  }

  const isAdded = find.queued.has(result.id);
  const isSelected = find.selectedIds.has(result.id);
  return (
    <ListRow
      className={isSelected ? findStyles.selectedRow : undefined}
      isLeadingSeparate
      leading={
        <SelectableArtwork
          ariaLabel={t("lobby.spotify.builder.toggleTrackSelection", { title: result.title })}
          isSelected={isSelected}
          onToggle={() => find.toggleSelected(result.id)}
        >
          {result.imageUrl ? <SelectableArtworkImage src={result.imageUrl} /> : <SpotifyLogo />}
        </SelectableArtwork>
      }
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
