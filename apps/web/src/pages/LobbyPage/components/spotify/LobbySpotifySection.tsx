import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared";
import { useI18n } from "../../../../features/i18n";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { SettingInfoButton } from "../../../../features/ui/SettingField";
import { SurfaceCard } from "../../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "../LobbySectionHeader";
import { PlaylistEditModal } from "../PlaylistEditModal";
import { useLobbySpotify } from "../../hooks/spotify/useLobbySpotify";
import { SpotifyLogo } from "./spotifySetupIcons";
import { SpotifySetupModal } from "./SpotifySetupModal";
import type { SpotifySetupSource } from "./spotifySetupTypes";
import lobbyStyles from "../../LobbyPage.module.css";
import styles from "./LobbySpotifySection.module.css";

interface LobbySpotifySectionProps {
  currentSettings: PublicRoomSettings;
}

export function LobbySpotifySection({ currentSettings }: LobbySpotifySectionProps) {
  const { t } = useI18n();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<SpotifySetupSource>("playlistUrl");
  const spotifyState = useLobbySpotify();
  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const accountType = spotifyState.auth.accountType ?? currentSettings.spotifyAccountType;
  const isConnecting = spotifyState.auth.authPhase === "connecting";

  useEffect(() => {
    if (isSetupOpen && spotifyState.savedPlaylists.generatedPlaylistMessage) {
      setActiveSource("playlistUrl");
    }
  }, [isSetupOpen, spotifyState.savedPlaylists.generatedPlaylistMessage]);

  const connectHint = isConnected
    ? accountType === "premium"
      ? t("lobby.spotify.browserPlaybackHint")
      : t("lobby.spotify.previewPlaybackHint")
    : isConnecting
      ? t("lobby.spotify.connectingHint")
      : t("lobby.spotify.unconnectedHint");

  return (
    <>
      <SurfaceCard className={lobbyStyles.settingsGroup}>
        <LobbySectionHeader
          description={t("lobby.spotify.description")}
          title={t("lobby.spotify.title")}
          titleAccessory={<SpotifyInfoButton />}
          titleAs="h3"
          variant="compact"
        />

        <div className={styles.spotifySetupSummary}>
          <div className={styles.spotifyConnectRow}>
            {isConnected ? (
              <div className={styles.spotifyConnectedState}>
                <div className={styles.spotifyBadgeRow}>
                  <span className={styles.spotifyConnectedBadge}>
                    <span className={styles.spotifyConnectedDot} />
                    {t("lobby.spotify.connected")}
                  </span>
                  {accountType ? <SpotifyAccountBadge accountType={accountType} /> : null}
                </div>

                {isImported ? (
                  <div className={styles.spotifySongsReady}>
                    <span className={styles.spotifySongsReadyDot} />
                    <span>
                      {t("lobby.spotify.tracksQueued", {
                        count: currentSettings.importedTrackCount,
                      })}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : spotifyState.auth.authPhase !== "error" ? (
              <div className={styles.spotifyConnectUnconnected}>
                <p className={styles.spotifyConnectHint}>{connectHint}</p>
              </div>
            ) : null}
          </div>

          {isConnected ? <p className={styles.spotifyConnectHint}>{connectHint}</p> : null}

          {spotifyState.auth.authPhase === "error" && spotifyState.auth.authError ? (
            <div className={styles.spotifyAuthErrorBlock}>
              <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
                {spotifyState.auth.authError}
              </p>
              <ActionButton
                className={styles.spotifyConnectBtn}
                onClick={spotifyState.auth.connectSpotify}
                type="button"
                variant="neutral"
              >
                <SpotifyLogo />
                {t("lobby.spotify.tryAgain")}
              </ActionButton>
            </div>
          ) : null}

          {spotifyState.auth.authPhase === "connecting" ? (
            <div className={styles.spotifyConnectActions}>
              <ActionButton
                className={styles.spotifyConnectCancelBtn}
                onClick={spotifyState.auth.cancelConnectSpotify}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.cancelConnect")}
              </ActionButton>
            </div>
          ) : null}

          <ActionButton
            className={styles.spotifySetupOpenBtn}
            onClick={() => setIsSetupOpen(true)}
            type="button"
            variant="neutral"
          >
            <SpotifyLogo />
            {isImported ? t("lobby.spotify.openSetupReady") : t("lobby.spotify.openSetup")}
          </ActionButton>
        </div>
      </SurfaceCard>

      <SpotifySetupModal
        activeSource={activeSource}
        currentSettings={currentSettings}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSourceChange={setActiveSource}
        spotifyState={spotifyState}
      />
      <PlaylistEditModal
        isOpen={spotifyState.queue.isEditModalOpen}
        onClose={spotifyState.queue.closeEditModal}
      />
    </>
  );
}

function SpotifyInfoButton() {
  const { t } = useI18n();
  const spotifyInfo: ReactNode = (
    <span className={lobbyStyles.ttInfoStack}>
      <span>
        <strong>{t("lobby.spotify.info.overviewTitle")}</strong>
        <span>{t("lobby.spotify.info.overviewBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.connectTitle")}</strong>
        <span>{t("lobby.spotify.info.connectBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.playbackTitle")}</strong>
        <span>{t("lobby.spotify.info.playbackBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.playlistTitle")}</strong>
        <span>{t("lobby.spotify.info.playlistBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.editTitle")}</strong>
        <span>{t("lobby.spotify.info.editBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.playersTitle")}</strong>
        <span>{t("lobby.spotify.info.playersBody")}</span>
      </span>
    </span>
  );

  return <SettingInfoButton info={spotifyInfo} label={t("lobby.spotify.infoLabel")} />;
}

function SpotifyAccountBadge({ accountType }: { accountType: "free" | "premium" }) {
  const { t } = useI18n();

  return (
    <span
      className={accountType === "premium" ? styles.spotifyPremiumBadge : styles.spotifyFreeBadge}
    >
      {accountType === "premium" ? `✦ ${t("lobby.spotify.premium")}` : t("lobby.spotify.free")}
    </span>
  );
}
