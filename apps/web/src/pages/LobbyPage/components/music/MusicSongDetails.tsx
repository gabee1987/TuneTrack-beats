import type { SpotifySmartSearchResult } from "@tunetrack/shared/client";
import { useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { Button, Chip, CoverArt, Dialog } from "../../../../features/ui/primitives";
import findStyles from "./musicFind.module.css";

interface MusicSongDetailsProps {
  disabled: boolean;
  isAdded: boolean;
  onClose: () => void;
  onToggle: (song: SpotifySmartSearchResult) => void;
  song: SpotifySmartSearchResult | null;
}

/** Everything Find knows about a song, with the same Add / Remove as its row. */
export function MusicSongDetails({
  disabled,
  isAdded,
  onClose,
  onToggle,
  song,
}: MusicSongDetailsProps) {
  const { t } = useI18n();
  // The song stays on screen while the dialog plays its exit.
  const [shown, setShown] = useState(song);
  if (song && song !== shown) setShown(song);

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onClose} variant="ghost">
            {t("common.close")}
          </Button>
          {shown ? (
            <Button
              disabled={disabled}
              haptic
              onClick={() => onToggle(shown)}
              variant={isAdded ? "danger" : "primary"}
            >
              {isAdded ? t("music.find.removeFromDeck") : t("music.find.addToDeck")}
            </Button>
          ) : null}
        </>
      }
      closeLabel={t("common.close")}
      isOpen={song !== null}
      onClose={onClose}
      title={shown?.title ?? ""}
    >
      {shown ? (
        <div className={findStyles.songDetails}>
          <CoverArt label={shown.title} size="lg" src={shown.imageUrl} />
          {isAdded ? <Chip>{t("music.songDetails.inDeck")}</Chip> : null}
          <dl className={findStyles.songFacts}>
            <dt>{t("music.songDetails.artist")}</dt>
            <dd>{shown.artist ?? shown.subtitle}</dd>
            {shown.albumTitle ? (
              <>
                <dt>{t("music.songDetails.album")}</dt>
                <dd>{shown.albumTitle}</dd>
              </>
            ) : null}
            <dt>{t("music.songDetails.year")}</dt>
            <dd>{shown.releaseYear ?? "—"}</dd>
          </dl>
          <p className={findStyles.songNote}>{t("music.songDetails.yearNote")}</p>
        </div>
      ) : null}
    </Dialog>
  );
}
