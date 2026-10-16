import {
  SPOTIFY_QUICK_PICK_PRESETS,
  type SpotifyQuickPickPresetId,
} from "@tunetrack/shared/client";
import { useId, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { MeasuredDisclosure } from "../../../../features/motion";
import { Button, CoverArt, NumberStepper } from "../../../../features/ui/primitives";
import {
  QUICK_PICK_MAX_SONGS,
  QUICK_PICK_MIN_SONGS,
  clampQuickPickSongs,
} from "../../hooks/music/musicSetupSelectors";
import type { LobbySpotifyCandidatesState } from "../../hooks/spotify/lobbySpotify.types";
import styles from "./music.module.css";
import findStyles from "./musicFind.module.css";

interface MusicQuickPicksProps {
  candidates: LobbySpotifyCandidatesState;
  disabled: boolean;
  /** Enough for this room with room to spare (`getRecommendedDeckSize`). */
  recommendedSongCount: number;
}

/**
 * Ten ready-made decks. Picking one shows its progress on the card itself, never the app-wide
 * loading screen, and the songs arrive for review (`22` §4.8, Quick picks).
 */
export function MusicQuickPicks({
  candidates,
  disabled,
  recommendedSongCount,
}: MusicQuickPicksProps) {
  const { t } = useI18n();
  const optionsId = useId();
  const [areOptionsOpen, setAreOptionsOpen] = useState(false);
  const [chosenSongCount, setChosenSongCount] = useState<number | null>(null);
  const [pickedId, setPickedId] = useState<SpotifyQuickPickPresetId | null>(null);
  const songCount = chosenSongCount ?? clampQuickPickSongs(recommendedSongCount);
  const isGenerating = candidates.candidatePhase === "generating";

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
                className={findStyles.quickPickCard}
                disabled={disabled || isGenerating}
                onClick={() => pick(preset.id)}
                type="button"
              >
                <CoverArt label={title} size="md" />
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
