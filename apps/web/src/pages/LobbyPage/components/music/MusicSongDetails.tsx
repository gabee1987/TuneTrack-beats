import type { SpotifySmartSearchResult } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { PanelView } from "../../../../features/overlay";
import {
  Button,
  Chip,
  CoverArt,
  FloatingBar,
  PageHeader,
  TextField,
} from "../../../../features/ui/primitives";
import styles from "../songSheet.module.css";

interface MusicSongDetailsProps {
  disabled: boolean;
  isAdded: boolean;
  onClose: () => void;
  onToggle: (song: SpotifySmartSearchResult) => void;
  song: SpotifySmartSearchResult | null;
}

/**
 * A song from Find, laid out like the song editor but read-only with a larger cover: nothing
 * changes here until the song is in a deck. Add / Remove is the same as its row.
 */
export function MusicSongDetails({
  disabled,
  isAdded,
  onClose,
  onToggle,
  song,
}: MusicSongDetailsProps) {
  const { t } = useI18n();

  return (
    <PanelView isOpen={song !== null} label={t("lobby.playlist.detailsTitle")} onDismiss={onClose}>
      {song ? (
        <>
          <div className={styles.header}>
            <PageHeader
              backLabel={t("common.back")}
              eyebrow={t("lobby.playlist.detailsTitle")}
              onBack={onClose}
              title={t("music.songDetails.heading")}
            />
          </div>

          <div className={styles.body}>
            <div className={styles.artworkHero}>
              <CoverArt label={song.title} size="hero" src={song.imageUrl} />
              <div className={styles.summary}>
                <strong className={styles.songTitle}>{song.title}</strong>
                <span className={styles.songArtist}>{song.artist ?? song.subtitle}</span>
                {isAdded ? (
                  <span className={styles.chips}>
                    <Chip>{t("music.songDetails.inDeck")}</Chip>
                  </span>
                ) : null}
              </div>
            </div>

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
            </div>
            <p className={styles.note}>{t("music.songDetails.yearNote")}</p>
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
