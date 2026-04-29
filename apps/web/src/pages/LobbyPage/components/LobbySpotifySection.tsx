import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared";
import { createMeasuredDisclosureMotion, createStandardTransition } from "../../../features/motion";
import { useI18n } from "../../../features/i18n";
import { SettingInfoButton } from "../../../features/ui/SettingField";
import { TextInput } from "../../../features/ui/TextInput";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "./LobbySectionHeader";
import { PlaylistEditModal } from "./PlaylistEditModal";
import { useLobbySpotify } from "../hooks/useLobbySpotify";
import styles from "../LobbyPage.module.css";

interface LobbySpotifySectionProps {
  currentSettings: PublicRoomSettings;
}

function SpotifyLogo() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={20}
      viewBox="0 0 24 24"
      width={20}
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function LobbySpotifySection({ currentSettings }: LobbySpotifySectionProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const {
    accountType,
    authError,
    authPhase,
    closeEditModal,
    connectSpotify,
    importContentHeight,
    importContentRef,
    importError,
    importPhase,
    importPlaylist,
    isEditModalOpen,
    openEditModal,
    playlistUrl,
    setPlaylistUrl,
  } = useLobbySpotify();

  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const isConnecting = authPhase === "connecting";
  const isImporting = importPhase === "importing";
  const spotifyInfo: ReactNode = (
    <span className={styles.ttInfoStack}>
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

  const connectHint = isConnected
    ? accountType === "premium"
      ? t("lobby.spotify.browserPlaybackHint")
      : t("lobby.spotify.appPlaybackHint")
    : isConnecting
      ? t("lobby.spotify.connectingHint")
      : null;

  return (
    <SurfaceCard className={styles.settingsGroup}>
      <LobbySectionHeader
        description={t("lobby.spotify.description")}
        title={t("lobby.spotify.title")}
        titleAccessory={
          <SettingInfoButton info={spotifyInfo} label={t("lobby.spotify.infoLabel")} />
        }
        titleAs="h3"
        variant="compact"
      />

      <div className={styles.spotifyConnectRow}>
        {isConnected ? (
          <div className={styles.spotifyConnectedState}>
            <div className={styles.spotifyBadgeRow}>
              <span className={styles.spotifyConnectedBadge}>
                <span className={styles.spotifyConnectedDot} />
                {t("lobby.spotify.connected")}
              </span>
              {accountType ? (
                <span
                  className={
                    accountType === "premium" ? styles.spotifyPremiumBadge : styles.spotifyFreeBadge
                  }
                >
                  {accountType === "premium"
                    ? `✦ ${t("lobby.spotify.premium")}`
                    : t("lobby.spotify.free")}
                </span>
              ) : null}
            </div>

            {isImported && importPhase !== "error" ? (
              <div className={styles.spotifySongsReady}>
                <span className={styles.spotifySongsReadyDot} />
                <span>
                  {t("lobby.spotify.tracksQueued", {
                    count: currentSettings.importedTrackCount,
                  })}
                </span>
              </div>
            ) : null}

            {connectHint ? <p className={styles.spotifyConnectHint}>{connectHint}</p> : null}
          </div>
        ) : (
          <div className={styles.spotifyConnectUnconnected}>
            <p className={styles.spotifyConnectHint}>
              {isConnecting
                ? t("lobby.spotify.connectingHint")
                : t("lobby.spotify.unconnectedHint")}
            </p>
            <button
              className={styles.spotifyConnectBtn}
              disabled={isConnecting}
              onClick={connectSpotify}
              type="button"
            >
              <SpotifyLogo />
              {isConnecting ? t("lobby.spotify.connecting") : t("lobby.spotify.connect")}
            </button>
          </div>
        )}
      </div>

      {authPhase === "error" && authError ? (
        <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>{authError}</p>
      ) : null}

      <motion.div
        animate={createMeasuredDisclosureMotion(reduceMotion, isConnected, importContentHeight)}
        initial={false}
        style={{
          overflow: "hidden",
          pointerEvents: isConnected ? "auto" : "none",
        }}
        transition={createStandardTransition(reduceMotion)}
      >
        <div className={styles.spotifyImportContent} ref={importContentRef}>
          <div className={styles.spotifyImportRow}>
            <TextInput
              disabled={isImporting}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder={t("lobby.spotify.playlistPlaceholder")}
              type="url"
              value={playlistUrl}
            />
            <button
              className={styles.spotifyImportBtn}
              disabled={!playlistUrl.trim() || isImporting}
              onClick={importPlaylist}
              type="button"
            >
              {isImporting
                ? t("lobby.spotify.loading")
                : isImported
                  ? t("lobby.spotify.reload")
                  : t("lobby.spotify.import")}
            </button>
          </div>

          {importPhase === "error" && importError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {importError}
            </p>
          ) : null}

          {isImported && importPhase !== "error" && !isImporting ? (
            <div className={styles.spotifyEditRow}>
              <button className={styles.spotifyEditBtn} onClick={openEditModal} type="button">
                {t("lobby.spotify.editPlaylist")}
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>

      <PlaylistEditModal isOpen={isEditModalOpen} onClose={closeEditModal} />
    </SurfaceCard>
  );
}
