import { m } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared/client";
import {
  MotionPresence,
  createModalOverlayMotionTargets,
  createModalSheetMotionTargets,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../../features/motion";
import { useI18n } from "../../../../features/i18n";
import { CloseIconButton } from "../../../../features/ui/CloseIconButton";
import type { LobbySpotifyState, SpotifySetupSource } from "./spotifySetupTypes";
import setupShellStyles from "./spotifySetupShell.module.css";
import sharedStyles from "./spotifyShared.module.css";

const SpotifyPlaylistSearchPanel = lazy(async () => {
  const module = await import("./SpotifyPlaylistSearchPanel");
  return { default: module.SpotifyPlaylistSearchPanel };
});

const SpotifyQuickPicksPanel = lazy(async () => {
  const module = await import("./SpotifyQuickPicksPanel");
  return { default: module.SpotifyQuickPicksPanel };
});

const SpotifySetupContent = lazy(async () => {
  const module = await import("./SpotifySetupContent");
  return { default: module.SpotifySetupContent };
});

interface SpotifySetupModalProps {
  activeSource: SpotifySetupSource;
  currentSettings: PublicRoomSettings;
  isOpen: boolean;
  onClose: () => void;
  onSourceChange: (source: SpotifySetupSource) => void;
  spotifyState: LobbySpotifyState;
}

export function SpotifySetupModal({
  activeSource,
  currentSettings,
  isOpen,
  onClose,
  onSourceChange,
  spotifyState,
}: SpotifySetupModalProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <MotionPresence>
      {isOpen ? (
        <m.div
          animate="animate"
          className={setupShellStyles.spotifySetupOverlay}
          exit="exit"
          initial="initial"
          onClick={onClose}
          transition={createStandardTransition(reduceMotion)}
          variants={createModalOverlayMotionTargets(reduceMotion)}
        >
          <m.div
            animate="animate"
            aria-label={t("lobby.spotify.setupLabel")}
            aria-modal="true"
            className={setupShellStyles.spotifySetupSheet}
            exit="exit"
            initial="initial"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            transition={createStandardTransition(reduceMotion)}
            variants={createModalSheetMotionTargets(reduceMotion)}
          >
            <div className={setupShellStyles.spotifySetupHeader}>
              <div className={setupShellStyles.spotifySourceTabs} role="tablist">
                <SpotifySourceTab
                  isActive={activeSource === "playlistUrl"}
                  label={t("lobby.spotify.source.playlistUrl")}
                  onClick={() => onSourceChange("playlistUrl")}
                />
                <SpotifySourceTab
                  isActive={activeSource === "findPlaylists"}
                  label={t("lobby.spotify.source.findPlaylists")}
                  onClick={() => onSourceChange("findPlaylists")}
                />
                <SpotifySourceTab
                  isActive={activeSource === "quickPicks"}
                  label={t("lobby.spotify.source.quickPicks")}
                  onClick={() => onSourceChange("quickPicks")}
                />
              </div>

              <div className={setupShellStyles.spotifySetupHeaderActions}>
                <CloseIconButton ariaLabel={t("lobby.spotify.closeSetup")} onClick={onClose} />
              </div>
            </div>

            <div className={setupShellStyles.spotifySetupBody}>
              <Suspense
                fallback={
                  <p className={sharedStyles.spotifyStatusLine}>{t("lobby.spotify.connecting")}</p>
                }
              >
                {activeSource === "findPlaylists" ? (
                  <SpotifyPlaylistSearchPanel spotifyState={spotifyState} />
                ) : activeSource === "quickPicks" ? (
                  <SpotifyQuickPicksPanel
                    currentSettings={currentSettings}
                    spotifyState={spotifyState}
                  />
                ) : (
                  <SpotifySetupContent
                    currentSettings={currentSettings}
                    spotifyState={spotifyState}
                  />
                )}
              </Suspense>
            </div>
          </m.div>
        </m.div>
      ) : null}
    </MotionPresence>
  );
}

interface SpotifySourceTabProps {
  disabled?: boolean;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

function SpotifySourceTab({ disabled, isActive, label, onClick }: SpotifySourceTabProps) {
  return (
    <button
      aria-selected={isActive}
      className={`${setupShellStyles.spotifySourceTab} ${isActive ? setupShellStyles.spotifySourceTabActive : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
