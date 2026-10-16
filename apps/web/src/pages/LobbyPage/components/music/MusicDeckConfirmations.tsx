import { useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { Button, Dialog } from "../../../../features/ui/primitives";
import type { SavedDeckSummary } from "../../hooks/music/musicSetupSelectors";
import styles from "./music.module.css";

/** A change that would drop the songs the game already has asks first. */
export type DeckConfirmation =
  | { kind: "removeAll" }
  | { kind: "usePractice" }
  | { deck: SavedDeckSummary; kind: "useSaved" };

interface MusicDeckConfirmationsProps {
  confirmation: DeckConfirmation | null;
  onCancel: () => void;
  onConfirm: (confirmation: DeckConfirmation) => void;
  /** How many songs the game has now. */
  songCount: number;
}

export function MusicDeckConfirmations({
  confirmation,
  onCancel,
  onConfirm,
  songCount,
}: MusicDeckConfirmationsProps) {
  const { t } = useI18n();
  // The question stays worded while the dialog plays its exit.
  const [shown, setShown] = useState<DeckConfirmation | null>(confirmation);
  if (confirmation && confirmation !== shown) setShown(confirmation);
  const isRemoval = shown?.kind === "removeAll";

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onCancel} variant="ghost">
            {t("common.cancel")}
          </Button>
          <Button
            haptic
            onClick={() => (shown ? onConfirm(shown) : undefined)}
            variant={isRemoval ? "danger" : "primary"}
          >
            {isRemoval ? t("music.decks.removeAll") : t("music.replace")}
          </Button>
        </>
      }
      closeLabel={t("common.close")}
      isOpen={confirmation !== null}
      onClose={onCancel}
      title={
        isRemoval
          ? t("music.decks.removeAllConfirm", { count: songCount })
          : t("music.replaceConfirm", { count: songCount })
      }
    >
      <p className={styles.dialogBody}>
        {isRemoval ? t("music.decks.removeAllBody") : getReplaceBody(shown, t)}
      </p>
    </Dialog>
  );
}

function getReplaceBody(
  confirmation: DeckConfirmation | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (confirmation?.kind === "useSaved") {
    return t("music.replaceWithDeck", {
      count: confirmation.deck.songCount,
      name: confirmation.deck.name,
    });
  }
  return t("music.replaceWithPractice");
}
