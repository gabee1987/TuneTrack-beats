import type { SpotifySmartSearchResult } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import {
  CollapsingHeaderBar,
  CollapsingHeaderCompact,
  CollapsingHeaderHero,
} from "../../../../features/motion";
import { PanelView } from "../../../../features/overlay";
import {
  Button,
  Chip,
  CoverArt,
  FloatingBar,
  PageHeader,
  TextField,
} from "../../../../features/ui/primitives";
import { useSongCoverFold } from "../../hooks/music/useSongCoverFold";
import styles from "../songSheet.module.css";

interface MusicSongDetailsProps {
  disabled: boolean;
  isAdded: boolean;
  onClose: () => void;
  onToggle: (song: SpotifySmartSearchResult) => void;
  song: SpotifySmartSearchResult | null;
}

/**
 * A song from Find, laid out like the song editor but read-only: nothing changes here until the
 * song is in a deck. Add / Remove is the same as its row.
 */
export function MusicSongDetails({
  disabled,
  isAdded,
  onClose,
  onToggle,
  song,
}: MusicSongDetailsProps) {
  const { t } = useI18n();
  const fold = useSongCoverFold(song?.id ?? null);

  return (
    <PanelView isOpen={song !== null} label={t("lobby.playlist.detailsTitle")} onDismiss={onClose}>
      {song ? (
        <>
          <CollapsingHeaderBar className={styles.header} collapse={fold.collapse}>
            <PageHeader
              backLabel={t("common.back")}
              eyebrow={t("lobby.playlist.detailsTitle")}
              onBack={onClose}
              leading={
                <CollapsingHeaderCompact className={styles.compactCover} collapse={fold.collapse}>
                  <CoverArt label={song.title} size="sm" src={song.imageUrl} />
                </CollapsingHeaderCompact>
              }
              title={t("music.songDetails.heading")}
            />
          </CollapsingHeaderBar>

          <div className={styles.body} ref={fold.scrollRef}>
            <CollapsingHeaderHero className={styles.artworkHero} collapse={fold.collapse}>
              <CoverArt label={song.title} size="fill" src={song.imageUrl} />
              <div className={styles.summary}>
                <strong className={styles.songTitle}>{song.title}</strong>
                <span className={styles.songArtist}>{song.artist ?? song.subtitle}</span>
                {isAdded ? (
                  <span className={styles.chips}>
                    <Chip>{t("music.songDetails.inDeck")}</Chip>
                  </span>
                ) : null}
              </div>
            </CollapsingHeaderHero>

            <div className={styles.fields}>
              <TextField label={t("lobby.playlist.fieldTitle")} readOnly value={song.title} />
              <TextField
                label={t("lobby.playlist.fieldArtist")}
                readOnly
                value={song.artist ?? song.subtitle}
              />
              {song.albumTitle ? (
                <TextField
                  label={t("lobby.playlist.fieldAlbum")}
                  readOnly
                  value={song.albumTitle}
                />
              ) : null}
              <TextField
                label={t("music.songDetails.year")}
                readOnly
                value={song.releaseYear ? String(song.releaseYear) : "—"}
              />
              <p className={styles.note}>{t("music.songDetails.yearNote")}</p>
            </div>
          </div>

          <div className={styles.actions}>
            <FloatingBar edge="bottom">
              <Button
                disabled={disabled}
                fullWidth
                haptic
                onClick={() => onToggle(song)}
                size="lg"
                variant={isAdded ? "danger" : "primary"}
              >
                {isAdded ? t("music.find.removeFromDeck") : t("music.find.addToDeck")}
              </Button>
            </FloatingBar>
          </div>
        </>
      ) : null}
    </PanelView>
  );
}
