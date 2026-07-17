import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared";
import {
  MotionPresence,
  createModalOverlayMotionTargets,
  createModalSheetMotionTargets,
  createStandardTransition,
} from "../../../../features/motion";
import { useI18n } from "../../../../features/i18n";
import { CloseIconButton } from "../../../../features/ui/CloseIconButton";
import { SpotifyPlaylistSearchPanel } from "./SpotifyPlaylistSearchPanel";
import { SpotifyQuickPicksPanel } from "./SpotifyQuickPicksPanel";
import { SpotifySetupContent } from "./SpotifySetupContent";
import type { LobbySpotifyState, SpotifySetupSource } from "./spotifySetupTypes";
import styles from "./LobbySpotifySection.module.css";

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
  const reduceMotion = useReducedMotion() ?? false;

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
        <motion.div
          animate="animate"
          className={styles.spotifySetupOverlay}
          exit="exit"
          initial="initial"
          onClick={onClose}
          transition={createStandardTransition(reduceMotion)}
          variants={createModalOverlayMotionTargets(reduceMotion)}
        >
          <motion.div
            animate="animate"
            aria-label={t("lobby.spotify.setupLabel")}
            aria-modal="true"
            className={styles.spotifySetupSheet}
            exit="exit"
            initial="initial"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            transition={createStandardTransition(reduceMotion)}
            variants={createModalSheetMotionTargets(reduceMotion)}
          >
            <div className={styles.spotifySetupHeader}>
              <div className={styles.spotifySourceTabs} role="tablist">
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
                  disabled
                  isActive={activeSource === "filters"}
                  label={t("lobby.spotify.source.filters")}
                  onClick={() => onSourceChange("filters")}
                />
                <SpotifySourceTab
                  isActive={activeSource === "quickPicks"}
                  label={t("lobby.spotify.source.quickPicks")}
                  onClick={() => onSourceChange("quickPicks")}
                />
              </div>

              <div className={styles.spotifySetupHeaderActions}>
                <CloseIconButton ariaLabel={t("lobby.spotify.closeSetup")} onClick={onClose} />
              </div>
            </div>

            <div className={styles.spotifySetupBody}>
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
            </div>
          </motion.div>
        </motion.div>
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
      className={`${styles.spotifySourceTab} ${isActive ? styles.spotifySourceTabActive : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
