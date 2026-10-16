import { MIN_PLAYLIST_TRACK_COUNT } from "@tunetrack/shared/client";
import { useEffect, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import { Button, FloatingBar, SelectionActionBar } from "../../../../features/ui/primitives";
import { PlaylistTrackDetailsSheet } from "../PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "../PlaylistTrackList";
import type { LobbySpotifyState } from "./spotifySetupTypes";
import sharedStyles from "./spotifyShared.module.css";
import panelsStyles from "./spotifyPanels.module.css";

/** The quick pick's songs; its title, count and Back sit in the sheet's bar. */
interface SpotifyCandidateReviewPanelProps {
  currentQueueCount?: number;
  spotifyState: LobbySpotifyState;
}

export function SpotifyCandidateReviewPanel({
  currentQueueCount = 0,
  spotifyState,
}: SpotifyCandidateReviewPanelProps) {
  const { t } = useI18n();
  const { candidates, savedPlaylists } = spotifyState;
  const {
    candidateError,
    candidatePhase,
    candidateTracks,
    removeCandidateTrack,
    updateCandidateTrack,
    applyGeneratedCandidates,
  } = candidates;
  const { generatedPlaylistMessage } = savedPlaylists;
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
  const selectedCandidateCount = selectedCandidateTrackIds.size;
  const applyTrackIds =
    selectedCandidateCount > 0 ? Array.from(selectedCandidateTrackIds) : undefined;
  const canUseFullGeneratedSet = candidateTracks.length >= MIN_PLAYLIST_TRACK_COUNT;
  const canUseSelectedTracks = selectedCandidateCount > 0;
  const canUseTracks = canUseSelectedTracks || canUseFullGeneratedSet;

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
    if (!canUseTracks) {
      return;
    }

    if (currentQueueCount > 0) {
      setIsApplyChoiceOpen(true);
      return;
    }

    applyGeneratedCandidates("replace", applyTrackIds);
  }

  function handleApplyChoice(mode: "append" | "replace") {
    setIsApplyChoiceOpen(false);
    applyGeneratedCandidates(mode, applyTrackIds);
  }

  return (
    <>
      {candidatePhase === "error" && candidateError ? (
        <p className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}>
          {candidateError}
        </p>
      ) : null}

      {hasGeneratedTracks ? (
        <section className={panelsStyles.spotifyCandidateReview}>
          <PlaylistTrackList
            onOpenTrack={(track) => setActiveCandidateTrackId(track.id)}
            onRemoveTrack={removeCandidateTrack}
            onToggleSelection={toggleCandidateTrackSelection}
            selectedIds={selectedCandidateTrackIds}
            tracks={candidateTracks}
          />

          <div className={panelsStyles.spotifySelectionDock}>
            {isApplyChoiceOpen ? (
              <div className={panelsStyles.spotifyApplyChoicePanel}>
                <div className={panelsStyles.spotifyApplyChoiceCopy}>
                  <strong>{t("lobby.spotify.quickPicks.applyChoiceTitle")}</strong>
                  <span>
                    {selectedCandidateCount > 0
                      ? t("lobby.spotify.quickPicks.applyChoiceSelectedDescription", {
                          selectedCount: selectedCandidateCount,
                          count: currentQueueCount,
                        })
                      : t("lobby.spotify.quickPicks.applyChoiceDescription", {
                          count: currentQueueCount,
                        })}
                  </span>
                </div>
                <div className={panelsStyles.spotifyApplyChoiceActions}>
                  <Button
                    disabled={isApplying}
                    fullWidth
                    onClick={() => handleApplyChoice("append")}
                    variant="secondary"
                  >
                    {t("lobby.spotify.quickPicks.appendToQueue")}
                  </Button>
                  <Button
                    disabled={isApplying}
                    fullWidth
                    onClick={() => handleApplyChoice("replace")}
                    variant="danger"
                  >
                    {t("lobby.spotify.quickPicks.replaceQueue")}
                  </Button>
                  <Button
                    disabled={isApplying}
                    fullWidth
                    onClick={() => setIsApplyChoiceOpen(false)}
                    variant="secondary"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : selectedCandidateCount > 0 ? (
              <SelectionActionBar
                actions={[
                  {
                    label: t("lobby.playlist.remove", { count: selectedCandidateCount }),
                    onClick: removeSelectedCandidateTracks,
                    variant: "danger",
                  },
                  {
                    disabled: isApplying,
                    label: t("lobby.spotify.review.useSelectedTracks", {
                      count: selectedCandidateCount,
                    }),
                    onClick: handleUseTracks,
                  },
                ]}
                count={selectedCandidateCount}
              />
            ) : (
              <FloatingBar edge="bottom">
                <Button
                  disabled={!canUseFullGeneratedSet || isApplying}
                  fullWidth
                  haptic
                  onClick={handleUseTracks}
                  size="lg"
                >
                  {isApplying
                    ? t("lobby.spotify.review.applying")
                    : t("lobby.spotify.review.useTracks")}
                </Button>
              </FloatingBar>
            )}
          </div>

          <PlaylistTrackDetailsSheet
            onClose={() => setActiveCandidateTrackId(null)}
            onSave={updateCandidateTrack}
            track={activeCandidateTrack}
          />
        </section>
      ) : null}
    </>
  );
}
