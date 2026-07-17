import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createStandardTransition } from "../../../../features/motion";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { PlaylistTrackDetailsSheet } from "../PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "../PlaylistTrackList";
import type { LobbySpotifyState } from "./spotifySetupTypes";
import styles from "./LobbySpotifySection.module.css";

interface SpotifyCandidateReviewPanelProps {
  backLabel?: string;
  currentQueueCount?: number;
  onBack?: () => void;
  spotifyState: LobbySpotifyState;
}

export function SpotifyCandidateReviewPanel({
  backLabel,
  currentQueueCount = 0,
  onBack,
  spotifyState,
}: SpotifyCandidateReviewPanelProps) {
  const { t } = useI18n();
  const {
    candidateError,
    candidatePhase,
    candidateTracks,
    generatedPlaylistMessage,
    removeCandidateTrack,
    updateCandidateTrack,
    useGeneratedCandidates,
  } = spotifyState;
  const { showToast } = useAppToast();
  const isApplying = candidatePhase === "applying";
  const hasGeneratedTracks = candidateTracks.length > 0;
  const [selectedCandidateTrackIds, setSelectedCandidateTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeCandidateTrackId, setActiveCandidateTrackId] = useState<string | null>(null);
  const [isApplyChoiceOpen, setIsApplyChoiceOpen] = useState(false);
  const activeCandidateTrack =
    candidateTracks.find((track) => track.id === activeCandidateTrackId) ?? null;

  useEffect(() => {
    if (!generatedPlaylistMessage) return;
    showToast({
      id: "spotify-generated-playlist",
      message: generatedPlaylistMessage,
      type: "success",
    });
  }, [generatedPlaylistMessage, showToast]);

  useEffect(() => {
    setSelectedCandidateTrackIds((prev) => {
      if (prev.size === 0) return prev;
      const availableIds = new Set(candidateTracks.map((track) => track.id));
      const next = new Set([...prev].filter((trackId) => availableIds.has(trackId)));
      return next.size === prev.size ? prev : next;
    });
    setActiveCandidateTrackId((trackId) =>
      trackId && candidateTracks.some((track) => track.id === trackId) ? trackId : null,
    );
  }, [candidateTracks]);

  function toggleCandidateTrackSelection(trackId: string) {
    setSelectedCandidateTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function removeSelectedCandidateTracks() {
    if (selectedCandidateTrackIds.size === 0) return;
    selectedCandidateTrackIds.forEach((trackId) => removeCandidateTrack(trackId));
    setSelectedCandidateTrackIds(new Set());
  }

  function handleUseTracks() {
    if (currentQueueCount > 0) {
      setIsApplyChoiceOpen(true);
      return;
    }

    useGeneratedCandidates("replace");
  }

  function handleApplyChoice(mode: "append" | "replace") {
    setIsApplyChoiceOpen(false);
    useGeneratedCandidates(mode);
  }

  return (
    <>
      {candidatePhase === "error" && candidateError ? (
        <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
          {candidateError}
        </p>
      ) : null}

      {hasGeneratedTracks ? (
        <section className={styles.spotifyCandidateReview}>
          <div className={styles.spotifyReviewHeader}>
            <span>{t("lobby.spotify.review.readyCount", { count: candidateTracks.length })}</span>
            {onBack && backLabel ? (
              <button className={styles.spotifyReviewBackBtn} onClick={onBack} type="button">
                {backLabel}
              </button>
            ) : null}
          </div>

          <PlaylistTrackList
            onOpenTrack={(track) => setActiveCandidateTrackId(track.id)}
            onRemoveTrack={removeCandidateTrack}
            onToggleSelection={toggleCandidateTrackSelection}
            selectedIds={selectedCandidateTrackIds}
            tracks={candidateTracks}
          />

          {selectedCandidateTrackIds.size > 0 ? (
            <div className={styles.spotifyBatchToolbar}>
              <span className={styles.spotifyBatchCount}>
                {t("lobby.playlist.selected", { count: selectedCandidateTrackIds.size })}
              </span>
              <ActionButton
                className={styles.spotifyBatchDeleteBtn}
                onClick={removeSelectedCandidateTracks}
                type="button"
                variant="danger"
              >
                {t("lobby.playlist.remove", { count: selectedCandidateTrackIds.size })}
              </ActionButton>
            </div>
          ) : null}

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.spotifyFloatingAction}
            initial={{ opacity: 0, y: 18 }}
            transition={createStandardTransition(false)}
          >
            <ActionButton
              className={styles.spotifyFloatingActionBtn}
              disabled={candidateTracks.length < 10 || isApplying}
              onClick={handleUseTracks}
              type="button"
              variant="primary"
            >
              {isApplying
                ? t("lobby.spotify.review.applying")
                : t("lobby.spotify.review.useTracks")}
            </ActionButton>
          </motion.div>

          {isApplyChoiceOpen ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={styles.spotifyApplyChoice}
              initial={{ opacity: 0, y: 12 }}
              transition={createStandardTransition(false)}
            >
              <div className={styles.spotifyApplyChoicePanel}>
                <div className={styles.spotifyApplyChoiceCopy}>
                  <strong>{t("lobby.spotify.quickPicks.applyChoiceTitle")}</strong>
                  <span>
                    {t("lobby.spotify.quickPicks.applyChoiceDescription", {
                      count: currentQueueCount,
                    })}
                  </span>
                </div>
                <div className={styles.spotifyApplyChoiceActions}>
                  <ActionButton
                    disabled={isApplying}
                    onClick={() => handleApplyChoice("append")}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.quickPicks.appendToQueue")}
                  </ActionButton>
                  <ActionButton
                    disabled={isApplying}
                    onClick={() => handleApplyChoice("replace")}
                    type="button"
                    variant="danger"
                  >
                    {t("lobby.spotify.quickPicks.replaceQueue")}
                  </ActionButton>
                  <ActionButton
                    disabled={isApplying}
                    onClick={() => setIsApplyChoiceOpen(false)}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
              </div>
            </motion.div>
          ) : null}

          <PlaylistTrackDetailsSheet
            onClose={() => setActiveCandidateTrackId(null)}
            onSave={updateCandidateTrack}
            presentation="fullscreen"
            track={activeCandidateTrack}
          />
        </section>
      ) : null}
    </>
  );
}
