import {
  SPOTIFY_QUICK_PICK_PRESETS,
  type SpotifyQuickPickPresetId,
} from "@tunetrack/shared/client";
import { useEffect, useId, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { useAppLoading } from "../../../../features/loading";
import { MeasuredDisclosure } from "../../../../features/motion";
import { Button, NumberStepper } from "../../../../features/ui/primitives";
import {
  QUICK_PICK_MAX_SONGS,
  QUICK_PICK_MIN_SONGS,
  clampQuickPickSongs,
} from "../../hooks/music/musicSetupSelectors";
import type { LobbySpotifyCandidatesState } from "../../hooks/spotify/lobbySpotify.types";
import { QuickPickArt } from "./QuickPickArt";
import styles from "./music.module.css";
import findStyles from "./musicFind.module.css";

interface MusicQuickPicksProps {
  candidates: LobbySpotifyCandidatesState;
  /** The id of the line that says why every action is held (offline), or `null`. */
  heldReasonId: string | null;
  /** Enough for this room with room to spare (`getRecommendedDeckSize`). */
  recommendedSongCount: number;
}

const QUICK_PICK_LOADING_ID = "music-quick-pick";

/**
 * The ready-made decks. Picking one covers the app with the loading screen until the songs
 * arrive for review (owner, 2026-10-16; `22` §4.8, Quick picks).
 */
export function MusicQuickPicks({
  candidates,
  heldReasonId,
  recommendedSongCount,
}: MusicQuickPicksProps) {
  const { t } = useI18n();
  const disabled = heldReasonId !== null;
  const optionsId = useId();
  const [areOptionsOpen, setAreOptionsOpen] = useState(false);
  const [chosenSongCount, setChosenSongCount] = useState<number | null>(null);
  const [pickedId, setPickedId] = useState<SpotifyQuickPickPresetId | null>(null);
  const songCount = chosenSongCount ?? clampQuickPickSongs(recommendedSongCount);
  const isGenerating = candidates.candidatePhase === "generating";
  const { hideLoading, showLoading } = useAppLoading();

  useEffect(() => {
    if (!isGenerating) return;
    showLoading({
      id: QUICK_PICK_LOADING_ID,
      message: t("music.quickPicks.loadingMessage"),
      title: t("music.quickPicks.loadingTitle"),
    });
    return () => hideLoading(QUICK_PICK_LOADING_ID);
  }, [hideLoading, isGenerating, showLoading, t]);

  function pick(presetId: SpotifyQuickPickPresetId) {
    setPickedId(presetId);
    candidates.generateCandidatesFromPreset(presetId, songCount);
  }

  return (
    // The tab is named Quick picks already; a heading here would only repeat it.
    <section aria-label={t("music.quickPicks.title")} className={findStyles.quickPicks}>
      <ul className={findStyles.quickPickGrid}>
        {SPOTIFY_QUICK_PICK_PRESETS.map((preset) => {
          const title = t(`lobby.spotify.quickPicks.${preset.id}.title`);
          const isPicked = isGenerating && pickedId === preset.id;
          return (
            <li key={preset.id}>
              <button
                aria-busy={isPicked || undefined}
                aria-describedby={heldReasonId ?? undefined}
                className={findStyles.quickPickCard}
                disabled={disabled || isGenerating}
                onClick={() => pick(preset.id)}
                type="button"
              >
                <QuickPickArt presetId={preset.id} />
                <span className={findStyles.quickPickCopy}>
                  <span className={findStyles.quickPickTitle}>{title}</span>
                  <span className={findStyles.quickPickDescription}>
                    {isPicked
                      ? t("music.quickPicks.generating")
                      : t(`lobby.spotify.quickPicks.${preset.id}.description`)}
                  </span>
                </span>
                {isPicked ? <span aria-hidden="true" className={findStyles.cardSpinner} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {candidates.candidatePhase === "error" && candidates.candidateError ? (
        <p className={styles.errorLine} role="alert">
          {candidates.candidateError}
        </p>
      ) : null}
      <Button
        aria-controls={optionsId}
        aria-expanded={areOptionsOpen}
        onClick={() => setAreOptionsOpen((isOpen) => !isOpen)}
        variant="tertiary"
      >
        {t("music.quickPicks.more")}
      </Button>
      <MeasuredDisclosure id={optionsId} isOpen={areOptionsOpen}>
        <div className={findStyles.quickPickOptions}>
          <p aria-hidden="true" className={findStyles.optionLabel}>
            {t("music.quickPicks.max")}
          </p>
          <NumberStepper
            disabled={disabled || isGenerating}
            label={t("music.quickPicks.max")}
            max={QUICK_PICK_MAX_SONGS}
            min={QUICK_PICK_MIN_SONGS}
            onChange={setChosenSongCount}
            step={10}
            value={songCount}
          />
          <p className={styles.statusLine}>
            {t("music.quickPicks.recommended", { count: recommendedSongCount })}
          </p>
        </div>
      </MeasuredDisclosure>
    </section>
  );
}
