import { MIN_RELEASE_YEAR, type PublicTrackInfo } from "@tunetrack/shared/client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "../../../features/i18n";
import {
  CollapsingHeaderBar,
  CollapsingHeaderCompact,
  CollapsingHeaderHero,
} from "../../../features/motion";
import { PanelView } from "../../../features/overlay";
import {
  Button,
  Chip,
  CoverArt,
  FloatingBar,
  NumberStepper,
  PageHeader,
  SettingRow,
  TextField,
} from "../../../features/ui/primitives";
import { ToggleSwitch } from "../../../features/ui/ToggleSwitch";
import { resolveArtworkUrl } from "../../../features/ui/resolveArtworkUrl";
import { needsYearCheck, type PlaylistTrackUpdatePatch } from "../hooks/music/playlistEditorTarget";
import type { SongReview } from "../hooks/music/useSongReview";
import { useSongCoverFold } from "../hooks/music/useSongCoverFold";
import styles from "./songSheet.module.css";

interface PlaylistTrackDetailsSheetProps {
  onClose: () => void;
  onSave: (trackId: string, patch: PlaylistTrackUpdatePatch) => void;
  review?: SongReview | undefined;
  track: PublicTrackInfo | null;
}

const MAX_RELEASE_YEAR = new Date().getFullYear() + 1;

/** The Song editor: the host corrects a song's details and says when its year is right. */
export function PlaylistTrackDetailsSheet({
  onClose,
  onSave,
  review,
  track,
}: PlaylistTrackDetailsSheetProps) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState(MIN_RELEASE_YEAR);
  const [isYearChecked, setIsYearChecked] = useState(false);
  const fold = useSongCoverFold(track?.id ?? null);

  useEffect(() => {
    if (!track) return;

    setTitle(track.title);
    setArtist(track.artist);
    setAlbumTitle(track.albumTitle);
    setReleaseYear(track.releaseYear);
    setIsYearChecked(track.metadataStatus === "verified");
  }, [track]);

  // Every way out of a review saves what was typed, so stepping on never loses an edit.
  function save(isChecked: boolean) {
    if (!track || !formRef.current?.reportValidity()) return;

    const patch = buildTrackUpdatePatch(track, {
      albumTitle: albumTitle.trim(),
      artist: artist.trim(),
      isYearChecked: isChecked,
      releaseYear,
      title: title.trim(),
    });
    if (Object.keys(patch).length > 0) onSave(track.id, patch);
    if (review) review.onNext();
    else onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(isYearChecked);
  }

  const spotifyYear = track?.sourceReleaseYear;

  // A view over the whole Music Setup panel, never nested in the list that opened it: inside
  // that list it sat below the panel header stacking context (B1).
  return (
    <PanelView isOpen={track !== null} label={t("lobby.playlist.detailsTitle")} onDismiss={onClose}>
      {track ? (
        <form className={styles.form} onSubmit={handleSubmit} ref={formRef}>
          <CollapsingHeaderBar className={styles.header} collapse={fold.collapse}>
            <PageHeader
              backLabel={t("common.back")}
              eyebrow={t("lobby.playlist.detailsTitle")}
              leading={
                <CollapsingHeaderCompact className={styles.compactCover} collapse={fold.collapse}>
                  <CoverArt label={track.title} size="sm" src={resolveArtworkUrl(track)} />
                </CollapsingHeaderCompact>
              }
              meta={
                review
                  ? t("music.song.position", { count: review.count, index: review.index })
                  : undefined
              }
              onBack={onClose}
              title={t("lobby.playlist.detailsHeading")}
            />
          </CollapsingHeaderBar>

          <div className={styles.body} ref={fold.scrollRef}>
            <CollapsingHeaderHero className={styles.artworkHero} collapse={fold.collapse}>
              <CoverArt label={track.title} size="fill" src={resolveArtworkUrl(track)} />
              <div className={styles.summary}>
                <strong className={styles.songTitle}>{track.title}</strong>
                <span className={styles.songArtist}>
                  {track.artist} · {track.albumTitle}
                </span>
                {needsYearCheck(track) ? (
                  <span className={styles.chips}>
                    <Chip className={styles.warning}>
                      <WarningIcon />
                      {t("lobby.playlist.statusCheck")}
                    </Chip>
                  </span>
                ) : null}
              </div>
            </CollapsingHeaderHero>

            <div className={styles.fields}>
              <TextField
                label={t("lobby.playlist.fieldTitle")}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
              <TextField
                label={t("lobby.playlist.fieldArtist")}
                maxLength={200}
                onChange={(event) => setArtist(event.target.value)}
                required
                value={artist}
              />
              <TextField
                label={t("lobby.playlist.fieldAlbum")}
                maxLength={200}
                onChange={(event) => setAlbumTitle(event.target.value)}
                required
                value={albumTitle}
              />
              <SettingRow
                description={
                  spotifyYear !== undefined && spotifyYear !== releaseYear
                    ? t("music.song.spotifyYear", { year: spotifyYear })
                    : undefined
                }
                title={t("lobby.playlist.fieldReleaseYear")}
              >
                <NumberStepper
                  isEditable
                  label={t("lobby.playlist.fieldReleaseYear")}
                  max={MAX_RELEASE_YEAR}
                  min={MIN_RELEASE_YEAR}
                  onChange={setReleaseYear}
                  value={releaseYear}
                />
              </SettingRow>
              <SettingRow
                description={t("music.song.yearCheckedBody")}
                title={t("lobby.playlist.statusVerified")}
              >
                <ToggleSwitch
                  ariaLabel={t("lobby.playlist.statusVerified")}
                  checked={isYearChecked}
                  onChange={setIsYearChecked}
                />
              </SettingRow>
            </div>
          </div>

          <div className={styles.actions}>
            <FloatingBar className={styles.actionRow} edge="bottom">
              {review ? (
                <>
                  <Button size="lg" type="submit" variant="secondary">
                    {t("music.song.next")}
                  </Button>
                  <Button fullWidth haptic onClick={() => save(true)} size="lg" type="button">
                    {t("music.song.looksRight")}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={onClose} size="lg" type="button" variant="secondary">
                    {t("common.cancel")}
                  </Button>
                  <Button fullWidth size="lg" type="submit">
                    {t("lobby.playlist.saveTrack")}
                  </Button>
                </>
              )}
            </FloatingBar>
          </div>
        </form>
      ) : null}
    </PanelView>
  );
}

interface EditableTrackFields {
  albumTitle: string;
  artist: string;
  isYearChecked: boolean;
  releaseYear: number;
  title: string;
}

/**
 * Only what changed. Year checked on marks the song verified; off, a song that was verified or
 * had a field changed becomes edited; otherwise its status stays (`22` §4.9).
 */
function buildTrackUpdatePatch(
  track: PublicTrackInfo,
  fields: EditableTrackFields,
): PlaylistTrackUpdatePatch {
  const patch: PlaylistTrackUpdatePatch = {};

  if (fields.title !== track.title) patch.title = fields.title;
  if (fields.artist !== track.artist) patch.artist = fields.artist;
  if (fields.albumTitle !== track.albumTitle) patch.albumTitle = fields.albumTitle;
  if (fields.releaseYear !== track.releaseYear) patch.releaseYear = fields.releaseYear;

  const hasFieldChange = Object.keys(patch).length > 0;
  const status = getEditedStatus(track, fields.isYearChecked, hasFieldChange);
  if (status !== track.metadataStatus) patch.metadataStatus = status;

  return patch;
}

function getEditedStatus(
  track: PublicTrackInfo,
  isYearChecked: boolean,
  hasFieldChange: boolean,
): PublicTrackInfo["metadataStatus"] {
  if (isYearChecked) return "verified";
  if (hasFieldChange || track.metadataStatus === "verified") return "edited";
  return track.metadataStatus;
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={14} viewBox="0 0 24 24" width={14}>
      <path d="M12 4 3 20h18L12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth={2} />
      <path d="M12 9v5" stroke="currentColor" strokeLinecap="round" strokeWidth={2} />
      <path d="M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeWidth={3} />
    </svg>
  );
}
