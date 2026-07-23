import { type PublicRoomState } from "@tunetrack/shared";
import type { Translate } from "../../../features/i18n";
import { useHostPlaybackContext } from "../hooks/HostPlaybackProvider";
import styles from "../GamePage.module.css";

interface PlaybackTabContentProps {
  roomState: PublicRoomState;
  t: Translate;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlaybackTabContent({ roomState, t }: PlaybackTabContentProps) {
  const { isReady, isPlaying, position, duration, pause, resume, seek } = useHostPlaybackContext();
  const { currentTrackCard, status } = roomState;
  const showTrackDetails = status === "reveal" || status === "finished";
  const hasTrack = currentTrackCard !== null;

  return (
    <div className={styles.playbackSection}>
      {hasTrack ? (
        <div className={styles.playbackArtworkLarge}>
          {showTrackDetails && currentTrackCard.releaseYear !== undefined ? (
            <p className={styles.playbackYear}>{currentTrackCard.releaseYear}</p>
          ) : null}
          {showTrackDetails && currentTrackCard.artworkUrl ? (
            <div className={styles.playbackArtworkWrapper}>
              <img alt="" className={styles.playbackArtworkImg} src={currentTrackCard.artworkUrl} />
            </div>
          ) : (
            <div className={styles.playbackMusicIconBox}>
              <PlaybackMusicNoteIcon />
            </div>
          )}
        </div>
      ) : null}

      <div className={styles.playbackControls}>
        <div className={styles.playbackTrackRow}>
          <div className={styles.playbackMeta}>
            {hasTrack && showTrackDetails ? (
              <>
                <div className={styles.playbackMetaRow}>
                  <p className={styles.playbackTitle}>{currentTrackCard.title}</p>
                </div>
                <p className={styles.playbackArtist}>{currentTrackCard.artist}</p>
                {currentTrackCard.albumTitle ? (
                  <p className={styles.playbackAlbum}>{currentTrackCard.albumTitle}</p>
                ) : null}
              </>
            ) : (
              <p className={styles.playbackHiddenNote}>
                {hasTrack ? t("gameMenu.songDetailsHidden") : t("gameMenu.noSongLoaded")}
              </p>
            )}
          </div>
        </div>

        {hasTrack && duration > 0 ? (
          <div className={styles.playbackProgressBlock}>
            <input
              aria-label={t("gameMenu.playbackPosition")}
              className={styles.playbackSlider}
              max={duration}
              min={0}
              onChange={(e) => seek(Number(e.target.value))}
              step={1000}
              type="range"
              value={Math.min(position, duration)}
            />
            <div className={styles.playbackTimeLabels}>
              <span>{formatMs(position)}</span>
              <span>{formatMs(duration)}</span>
            </div>
          </div>
        ) : null}

        <div className={styles.playbackActions}>
          {hasTrack ? (
            <button
              aria-label={isPlaying ? t("gameMenu.pause") : t("gameMenu.play")}
              className={styles.playbackCircleBtn}
              disabled={!isReady}
              onClick={isPlaying ? pause : resume}
              type="button"
            >
              {isPlaying ? <PlaybackPauseIcon /> : <PlaybackPlayIcon />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlaybackPlayIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={20} viewBox="0 0 24 24" width={32}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PlaybackPauseIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={20} viewBox="0 0 24 24" width={32}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function PlaybackMusicNoteIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height={48} viewBox="0 0 24 24" width={48}>
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}
