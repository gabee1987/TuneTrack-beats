import { useEffect, useState } from "react";
import {
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  SPOTIFY_QUICK_PICK_PRESETS,
  type PublicRoomSettings,
} from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { useAppLoading } from "../../../../features/loading";
import { TextInput } from "../../../../features/ui/TextInput";
import { SpotifyCandidateReviewPanel } from "./SpotifyCandidateReviewPanel";
import type { LobbySpotifyState } from "./spotifySetupTypes";
import discoveryStyles from "./spotifyDiscovery.module.css";
import panelsStyles from "./spotifyPanels.module.css";

export function SpotifyQuickPicksPanel({
  currentSettings,
  spotifyState,
}: {
  currentSettings: PublicRoomSettings;
  spotifyState: LobbySpotifyState;
}) {
  const { t } = useI18n();
  const { hideLoading, showLoading } = useAppLoading();
  const { candidatePhase, candidateTracks, generateCandidatesFromPreset } = spotifyState.candidates;
  const [targetCountInput, setTargetCountInput] = useState("250");
  const isGenerating = candidatePhase === "generating";
  const hasGeneratedTracks = candidateTracks.length > 0;
  const targetCount = clampQuickPickTargetCount(targetCountInput);

  useEffect(() => {
    const loadingId = "spotify-quick-pick-generation";
    if (!isGenerating) {
      hideLoading(loadingId);
      return;
    }

    showLoading({
      id: loadingId,
      title: t("appLoading.spotifyQuickPick.title"),
      message: t("appLoading.spotifyQuickPick.message"),
    });

    return () => hideLoading(loadingId);
  }, [hideLoading, isGenerating, showLoading, t]);

  return (
    <div className={discoveryStyles.spotifyDiscoveryPanel}>
      {!hasGeneratedTracks ? (
        <section className={panelsStyles.spotifyQuickPicksPanel}>
          <label className={panelsStyles.spotifyQuickPickLimitField}>
            <span>{t("lobby.spotify.quickPicks.limitLabel")}</span>
            <TextInput
              inputMode="numeric"
              max={SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT}
              min={10}
              onChange={(event) => setTargetCountInput(event.target.value)}
              type="number"
              value={targetCountInput}
            />
          </label>
          <div className={panelsStyles.spotifyQuickPickGrid}>
            {SPOTIFY_QUICK_PICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={panelsStyles.spotifyQuickPickCard}
                disabled={isGenerating}
                onClick={() => generateCandidatesFromPreset(preset.id, targetCount)}
                type="button"
              >
                <span className={panelsStyles.spotifyQuickPickTitle}>
                  {t(`lobby.spotify.quickPicks.${preset.id}.title`)}
                </span>
                <span className={panelsStyles.spotifyQuickPickDescription}>
                  {t(`lobby.spotify.quickPicks.${preset.id}.description`)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <SpotifyCandidateReviewPanel
        currentQueueCount={currentSettings.importedTrackCount}
        spotifyState={spotifyState}
      />
    </div>
  );
}

function clampQuickPickTargetCount(value: string): number {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) return 250;
  return Math.min(Math.max(parsedValue, 10), SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT);
}
