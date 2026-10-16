import { useI18n } from "../../../../features/i18n";
import { Button } from "../../../../features/ui/primitives";
import type { MusicPlaybackState } from "../../hooks/music/musicSetupSelectors";
import type { LobbySpotifyAuthState } from "../../hooks/spotify/lobbySpotify.types";
import { SpotifyLogo } from "../spotify/spotifySetupIcons";
import styles from "./music.module.css";

interface MusicPlaybackBlockProps {
  auth: LobbySpotifyAuthState;
  disabled: boolean;
  state: MusicPlaybackState;
}

/**
 * Where the songs will sound. Login is a playback matter only: nothing below this block waits for
 * it, and the per-room login note (decision 10) lives here and nowhere else (`22` §4.8).
 */
export function MusicPlaybackBlock({ auth, disabled, state }: MusicPlaybackBlockProps) {
  const { t } = useI18n();

  return (
    <section aria-label={t("music.playback.label")} className={styles.playback}>
      <span aria-hidden="true" className={styles.playbackLogo}>
        <SpotifyLogo />
      </span>
      <div className={styles.playbackCopy}>{renderCopy()}</div>
      {renderControl()}
    </section>
  );

  function renderCopy() {
    switch (state) {
      case "none":
        return (
          <>
            <p className={styles.playbackText}>{t("music.playback.unconnected")}</p>
            <p className={styles.playbackNote}>{t("music.playback.perRoom")}</p>
          </>
        );
      case "connecting":
        return <p className={styles.playbackText}>{t("music.playback.connecting")}</p>;
      case "error":
        return (
          <p className={styles.playbackError} role="alert">
            {auth.authError ?? t("music.playback.failed")}
          </p>
        );
      case "premium":
        return <p className={styles.playbackText}>{t("music.playback.premium")}</p>;
      case "free":
        return <p className={styles.playbackText}>{t("music.playback.free")}</p>;
    }
  }

  function renderControl() {
    switch (state) {
      case "none":
        return (
          <Button disabled={disabled} onClick={auth.connectSpotify} variant="spotify">
            {t("music.playback.connect")}
          </Button>
        );
      case "connecting":
        return (
          <Button onClick={auth.cancelConnectSpotify} variant="tertiary">
            {t("common.cancel")}
          </Button>
        );
      case "error":
        return (
          <Button disabled={disabled} onClick={auth.connectSpotify} variant="spotify">
            {t("music.playback.retry")}
          </Button>
        );
      case "premium":
      case "free":
        return null;
    }
  }
}
