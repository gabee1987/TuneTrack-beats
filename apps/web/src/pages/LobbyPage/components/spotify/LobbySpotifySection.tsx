import type { ReactNode } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared/client";
import { FirstRunHint } from "../../../../features/hints/FirstRunHint";
import { useI18n } from "../../../../features/i18n";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { SettingInfoButton } from "../../../../features/ui/SettingField";
import { SurfaceCard } from "../../../../features/ui/SurfaceCard";
import { LobbySectionHeader } from "../LobbySectionHeader";
import { useLobbySpotify } from "../../hooks/spotify/useLobbySpotify";
import { SpotifyLogo } from "./spotifySetupIcons";
import { SpotifySetupModal } from "./SpotifySetupModal";
import type { SpotifySetupSource } from "./spotifySetupTypes";
import lobbyStyles from "../../lobbySettings.module.css";
import setupShellStyles from "./spotifySetupShell.module.css";
import sharedStyles from "./spotifyShared.module.css";

interface LobbySpotifySectionProps {
  currentSettings: PublicRoomSettings;
}

// Host-only and opened on demand: the editor and its stylesheets stay out of the lobby chunk (05 D4).
async function loadPlaylistEditModal() {
  const module = await import("../PlaylistEditModal");
  return { default: module.PlaylistEditModal };
}

const PlaylistEditModal = lazy(loadPlaylistEditModal);

export function LobbySpotifySection({ currentSettings }: LobbySpotifySectionProps) {
  const { t } = useI18n();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<SpotifySetupSource>("playlistUrl");
  const [spotifyHintAnchor, setSpotifyHintAnchor] = useState<HTMLElement | null>(null);
  const spotifyState = useLobbySpotify();
  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const accountType = spotifyState.auth.accountType ?? currentSettings.spotifyAccountType;
  const isConnecting = spotifyState.auth.authPhase === "connecting";
  const isEditModalOpen = spotifyState.queue.isEditModalOpen;
  const [hasOpenedEditModal, setHasOpenedEditModal] = useState(isEditModalOpen);

  if (isEditModalOpen && !hasOpenedEditModal) {
    setHasOpenedEditModal(true);
  }

  useEffect(() => {
    if (isImported) {
      void loadPlaylistEditModal();
    }
  }, [isImported]);

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

        <div className={setupShellStyles.spotifySetupSummary}>
          <div className={setupShellStyles.spotifyConnectRow}>
            {isConnected ? (
              <div className={setupShellStyles.spotifyConnectedState}>
                <div className={setupShellStyles.spotifyBadgeRow}>
                  <span className={setupShellStyles.spotifyConnectedBadge}>
                    <span className={setupShellStyles.spotifyConnectedDot} />
                    {t("lobby.spotify.connected")}
                  </span>
                  {accountType ? <SpotifyAccountBadge accountType={accountType} /> : null}
                </div>

                {isImported ? (
                  <div className={setupShellStyles.spotifySongsReady}>
                    <span className={setupShellStyles.spotifySongsReadyDot} />
                    <span>
                      {t("lobby.spotify.tracksQueued", {
                        count: currentSettings.importedTrackCount,
                      })}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : spotifyState.auth.authPhase !== "error" ? (
              <div className={setupShellStyles.spotifyConnectUnconnected}>
                <p className={setupShellStyles.spotifyConnectHint}>{connectHint}</p>
              </div>
            ) : null}
          </div>

          {isConnected ? (
            <p className={setupShellStyles.spotifyConnectHint}>{connectHint}</p>
          ) : null}

          {spotifyState.auth.authPhase === "error" && spotifyState.auth.authError ? (
            <div className={setupShellStyles.spotifyAuthErrorBlock}>
              <p className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}>
                {spotifyState.auth.authError}
              </p>
              <ActionButton
                className={setupShellStyles.spotifyConnectBtn}
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
            <div className={setupShellStyles.spotifyConnectActions}>
              <ActionButton
                className={setupShellStyles.spotifyConnectCancelBtn}
                onClick={spotifyState.auth.cancelConnectSpotify}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.cancelConnect")}
              </ActionButton>
            </div>
          ) : null}

          <div ref={setSpotifyHintAnchor}>
            <ActionButton
              className={setupShellStyles.spotifySetupOpenBtn}
              onClick={() => setIsSetupOpen(true)}
              type="button"
              variant="neutral"
            >
              <SpotifyLogo />
              {isImported ? t("lobby.spotify.openSetupReady") : t("lobby.spotify.openSetup")}
            </ActionButton>
          </div>
        </div>
      </SurfaceCard>

      <FirstRunHint anchor={spotifyHintAnchor} id="lobby-spotify" isEligible={!isImported} />

      <SpotifySetupModal
        activeSource={activeSource}
        currentSettings={currentSettings}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSourceChange={setActiveSource}
        spotifyState={spotifyState}
      />
      {hasOpenedEditModal ? (
        <Suspense fallback={null}>
          <PlaylistEditModal isOpen={isEditModalOpen} onClose={spotifyState.queue.closeEditModal} />
        </Suspense>
      ) : null}
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
      className={
        accountType === "premium"
          ? setupShellStyles.spotifyPremiumBadge
          : setupShellStyles.spotifyFreeBadge
      }
    >
      {accountType === "premium" ? `✦ ${t("lobby.spotify.premium")}` : t("lobby.spotify.free")}
    </span>
  );
}
