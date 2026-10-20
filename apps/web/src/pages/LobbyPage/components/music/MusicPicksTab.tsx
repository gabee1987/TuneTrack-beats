import { useId } from "react";
import { useI18n } from "../../../../features/i18n";
import { Button } from "../../../../features/ui/primitives";
import type { LobbySpotifyCandidatesState } from "../../hooks/spotify/lobbySpotify.types";
import type { PracticeDeckChoiceStatus } from "../../hooks/spotify/usePracticeDeckChoice";
import { MusicQuickPicks } from "./MusicQuickPicks";
import styles from "./music.module.css";
import findStyles from "./musicFind.module.css";

interface MusicPicksTabProps {
  candidates: LobbySpotifyCandidatesState;
  /** The id of the line that says why every action is held (offline), or `null`. */
  heldReasonId: string | null;
  onUsePracticeDeck: () => void;
  practiceDeckStatus: PracticeDeckChoiceStatus;
  recommendedSongCount: number;
}

/**
 * Ready-made decks, apart from search so Find stays one job (owner, 2026-10-16): the quick
 * picks, then the practice deck with no audio.
 */
export function MusicPicksTab({
  candidates,
  heldReasonId,
  onUsePracticeDeck,
  practiceDeckStatus,
  recommendedSongCount,
}: MusicPicksTabProps) {
  const { t } = useI18n();
  const practiceTitleId = useId();

  return (
    <div className={styles.tab}>
      <MusicQuickPicks
        candidates={candidates}
        heldReasonId={heldReasonId}
        recommendedSongCount={recommendedSongCount}
      />

      <section aria-labelledby={practiceTitleId} className={findStyles.practice}>
        <h3 className={styles.sectionTitle} id={practiceTitleId}>
          {t("lobby.practiceDeck.title")}
        </h3>
        <p className={styles.statusLine}>{t("lobby.practiceDeck.description")}</p>
        <Button
          aria-describedby={heldReasonId ?? undefined}
          disabled={heldReasonId !== null}
          isLoading={practiceDeckStatus === "pending"}
          onClick={onUsePracticeDeck}
          variant="secondary"
        >
          {t("lobby.practiceDeck.use")}
        </Button>
        {practiceDeckStatus === "failed" ? (
          <p className={styles.errorLine} role="alert">
            {t("lobby.practiceDeck.failed")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
