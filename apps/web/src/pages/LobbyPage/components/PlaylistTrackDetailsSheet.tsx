import {
  MIN_RELEASE_YEAR,
  getTrackCurationFlags,
  type PublicTrackInfo,
  type TrackMetadataStatus,
} from "@tunetrack/shared/client";
import { type FormEvent, useEffect, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { PanelView } from "../../../features/overlay";
import {
  Button,
  Chip,
  CoverArt,
  FloatingBar,
  PageHeader,
  SegmentedControl,
  TextField,
} from "../../../features/ui/primitives";
import { resolveArtworkUrl } from "../../../features/ui/resolveArtworkUrl";
import type { PlaylistTrackUpdatePatch } from "../hooks/usePlaylistEditor";
import styles from "./songSheet.module.css";

interface PlaylistTrackDetailsSheetProps {
  onClose: () => void;
  onSave: (trackId: string, patch: PlaylistTrackUpdatePatch) => void;
  track: PublicTrackInfo | null;
}

const METADATA_STATUS_OPTIONS: TrackMetadataStatus[] = ["imported", "edited", "verified"];

export function PlaylistTrackDetailsSheet({
  onClose,
  onSave,
  track,
}: PlaylistTrackDetailsSheetProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [metadataStatus, setMetadataStatus] = useState<TrackMetadataStatus>("imported");

  useEffect(() => {
    if (!track) return;

    setTitle(track.title);
    setArtist(track.artist);
    setAlbumTitle(track.albumTitle);
    setReleaseYear(String(track.releaseYear));
    setMetadataStatus(track.metadataStatus);
  }, [track]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!track) return;

    const parsedReleaseYear = Number.parseInt(releaseYear, 10);
    if (!Number.isInteger(parsedReleaseYear)) return;

    const patch = buildTrackUpdatePatch(track, {
      albumTitle: albumTitle.trim(),
      artist: artist.trim(),
      metadataStatus,
      releaseYear: parsedReleaseYear,
      title: title.trim(),
    });

    if (Object.keys(patch).length > 0) {
      onSave(track.id, patch);
    }
    onClose();
  }

  const flags = track ? getTrackCurationFlags(track) : [];

  // A view over the whole Music Setup panel, never nested in the list that opened it: inside
  // that list it sat below the panel header stacking context (B1).
  return (
    <PanelView isOpen={track !== null} label={t("lobby.playlist.detailsTitle")} onDismiss={onClose}>
      {track ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.header}>
            <PageHeader
              backLabel={t("common.back")}
              eyebrow={t("lobby.playlist.detailsTitle")}
              onBack={onClose}
              title={t("lobby.playlist.detailsHeading")}
            />
          </div>

          <div className={styles.body}>
            <div className={styles.artworkRow}>
              <CoverArt label={track.title} size="md" src={resolveArtworkUrl(track)} />
              <div className={styles.summary}>
                <strong className={styles.songTitle}>{track.title}</strong>
                <span className={styles.songArtist}>
                  {track.artist} · {track.albumTitle}
                </span>
                <span className={styles.chips}>
                  <Chip>
                    {t("lobby.playlist.sourceYearShort", {
                      year: track.sourceReleaseYear ?? track.releaseYear,
                    })}
                  </Chip>
                  {flags.includes("suspicious_album") ? (
                    <Chip className={styles.warning}>
                      <WarningIcon />
                      {t("lobby.playlist.statusCheck")}
                    </Chip>
                  ) : null}
                </span>
              </div>
            </div>

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
              <TextField
                inputMode="numeric"
                label={t("lobby.playlist.fieldReleaseYear")}
                max={new Date().getFullYear() + 1}
                min={MIN_RELEASE_YEAR}
                onChange={(event) => setReleaseYear(event.target.value)}
                required
                type="number"
                value={releaseYear}
              />
              <div className={styles.statusField}>
                <span aria-hidden="true">{t("lobby.playlist.fieldStatus")}</span>
                <SegmentedControl<TrackMetadataStatus>
                  aria-label={t("lobby.playlist.fieldStatus")}
                  onChange={setMetadataStatus}
                  options={METADATA_STATUS_OPTIONS.map((status) => ({
                    label: getStatusLabel(t, status),
                    value: status,
                  }))}
                  value={metadataStatus}
                />
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <FloatingBar className={styles.actionRow} edge="bottom">
              <Button onClick={onClose} size="lg" type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <Button fullWidth size="lg" type="submit">
                {t("lobby.playlist.saveTrack")}
              </Button>
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
  metadataStatus: TrackMetadataStatus;
  releaseYear: number;
  title: string;
}

function buildTrackUpdatePatch(
  track: PublicTrackInfo,
  fields: EditableTrackFields,
): PlaylistTrackUpdatePatch {
  const patch: PlaylistTrackUpdatePatch = {};

  if (fields.title !== track.title) patch.title = fields.title;
  if (fields.artist !== track.artist) patch.artist = fields.artist;
  if (fields.albumTitle !== track.albumTitle) patch.albumTitle = fields.albumTitle;
  if (fields.releaseYear !== track.releaseYear) patch.releaseYear = fields.releaseYear;
  if (fields.metadataStatus !== track.metadataStatus) {
    patch.metadataStatus = fields.metadataStatus;
  }

  if (
    patch.metadataStatus === undefined &&
    (patch.title !== undefined ||
      patch.artist !== undefined ||
      patch.albumTitle !== undefined ||
      patch.releaseYear !== undefined)
  ) {
    patch.metadataStatus = "edited";
  }

  return patch;
}

function getStatusLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  status: TrackMetadataStatus,
): string {
  if (status === "verified") return t("lobby.playlist.statusVerified");
  if (status === "edited") return t("lobby.playlist.statusEdited");
  return t("lobby.playlist.statusImported");
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
