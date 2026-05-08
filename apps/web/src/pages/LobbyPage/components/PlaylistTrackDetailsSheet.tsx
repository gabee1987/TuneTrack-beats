import type { PublicTrackInfo, TrackMetadataStatus } from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useEffect, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { MotionPresence } from "../../../features/motion";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { TextInput } from "../../../features/ui/TextInput";
import type { PlaylistTrackUpdatePatch } from "../hooks/usePlaylistEditor";
import { getPlaylistTrackCurationFlags } from "../playlistMetadataFlags";
import styles from "./PlaylistEditModal.module.css";

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
  const reduceMotion = useReducedMotion() ?? false;
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

  const flags = track ? getPlaylistTrackCurationFlags(track) : [];

  return (
    <MotionPresence>
      {track ? (
        <motion.div
          animate={{ opacity: 1 }}
          className={styles.detailsOverlay}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.16 }}
        >
          <motion.form
            animate={{ x: 0 }}
            className={styles.detailsSheet}
            exit={{ x: reduceMotion ? 0 : 40 }}
            initial={{ x: reduceMotion ? 0 : 40 }}
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: "spring", damping: 30, stiffness: 360, mass: 0.8 }
            }
          >
            <div className={styles.detailsHeader}>
              <div>
                <p className={styles.detailsEyebrow}>{t("lobby.playlist.detailsEyebrow")}</p>
                <h3 className={styles.detailsTitle}>{t("lobby.playlist.detailsTitle")}</h3>
              </div>
              <CloseIconButton ariaLabel={t("lobby.playlist.detailsClose")} onClick={onClose} />
            </div>

            <div className={styles.detailsArtworkRow}>
              <div className={styles.detailsArtwork}>
                {track.artworkUrl ? (
                  <img alt="" className={styles.trackArtworkImg} src={track.artworkUrl} />
                ) : (
                  <MusicNoteIcon />
                )}
              </div>
              <div className={styles.detailsSummary}>
                <div className={styles.detailsAlbumRow}>
                  <span className={styles.detailsAlbumTitle}>{track.albumTitle}</span>
                  <span
                    className={styles.detailsSourceYear}
                    title={t("lobby.playlist.sourceYearShort", {
                      year: track.sourceReleaseYear ?? track.releaseYear,
                    })}
                  >
                    {track.sourceReleaseYear ?? track.releaseYear}
                  </span>
                </div>
                <strong>{track.title}</strong>
                <span className={styles.detailsArtist}>{track.artist}</span>
                {flags.includes("suspicious_album") ? (
                  <span className={styles.detailsWarning}>
                    <WarningIcon />
                    {t("lobby.playlist.statusCheck")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className={styles.detailsFields}>
              <label className={styles.fieldLabel}>
                <span>{t("lobby.playlist.fieldTitle")}</span>
                <TextInput
                  className={styles.detailsTextInput}
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  type="text"
                  value={title}
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>{t("lobby.playlist.fieldArtist")}</span>
                <TextInput
                  className={styles.detailsTextInput}
                  maxLength={200}
                  onChange={(event) => setArtist(event.target.value)}
                  required
                  type="text"
                  value={artist}
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>{t("lobby.playlist.fieldAlbum")}</span>
                <TextInput
                  className={styles.detailsTextInput}
                  maxLength={200}
                  onChange={(event) => setAlbumTitle(event.target.value)}
                  required
                  type="text"
                  value={albumTitle}
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>{t("lobby.playlist.fieldReleaseYear")}</span>
                <TextInput
                  className={styles.detailsTextInput}
                  max={new Date().getFullYear() + 1}
                  min={1900}
                  onChange={(event) => setReleaseYear(event.target.value)}
                  required
                  type="number"
                  value={releaseYear}
                />
              </label>
              <div className={styles.statusField}>
                <span>{t("lobby.playlist.fieldStatus")}</span>
                <div className={styles.statusSegmentedControl}>
                  {METADATA_STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      className={`${styles.statusOption} ${
                        metadataStatus === status ? styles.statusOptionActive : ""
                      }`}
                      onClick={() => setMetadataStatus(status)}
                      type="button"
                    >
                      {getStatusLabel(t, status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.detailsActions}>
              <ActionButton
                className={styles.secondaryButton}
                onClick={onClose}
                type="button"
                variant="neutral"
              >
                {t("common.cancel")}
              </ActionButton>
              <ActionButton className={styles.primaryButton} type="submit">
                {t("lobby.playlist.saveTrack")}
              </ActionButton>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </MotionPresence>
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

function MusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={34} viewBox="0 0 24 24" width={34}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
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
