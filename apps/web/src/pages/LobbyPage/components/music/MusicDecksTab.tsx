import { useI18n } from "../../../../features/i18n";
import { Button, Chip, CoverArt, EmptyState, IconButton } from "../../../../features/ui/primitives";
import type { SavedDeckSummary } from "../../hooks/music/musicSetupSelectors";
import { ChevronGlyph, MoreGlyph } from "./musicGlyphs";
import styles from "./music.module.css";

export interface RoomDeckSummary {
  /** The room deck opens the song editor; the practice deck has nothing to edit. */
  isEditable: boolean;
  songCount: number;
  toCheckCount: number;
}

interface MusicDecksTabProps {
  disabled: boolean;
  onDeckOptions: (deck: SavedDeckSummary) => void;
  onEditRoomDeck: () => void;
  onFind: () => void;
  onRemoveRoomDeck: () => void;
  onSaveRoomDeck: () => void;
  onUseDeck: (deck: SavedDeckSummary) => void;
  roomDeck: RoomDeckSummary | null;
  savedDecks: readonly SavedDeckSummary[];
  /** The last save, rename or delete, said once under the decks. */
  statusMessage: string | null;
}

/** The deck in this game first, then the decks saved on this device (`22` §4.8, Your decks). */
export function MusicDecksTab({
  disabled,
  onDeckOptions,
  onEditRoomDeck,
  onFind,
  onRemoveRoomDeck,
  onSaveRoomDeck,
  onUseDeck,
  roomDeck,
  savedDecks,
  statusMessage,
}: MusicDecksTabProps) {
  const { t } = useI18n();

  return (
    <div className={styles.tab}>
      {roomDeck ? (
        <section aria-label={t("music.decks.current")} className={styles.roomDeck}>
          <button
            aria-label={`${t("music.decks.current")}, ${t("music.decks.songs", { count: roomDeck.songCount })}`}
            className={styles.roomDeckButton}
            disabled={disabled || !roomDeck.isEditable}
            onClick={onEditRoomDeck}
            type="button"
          >
            <CoverArt label={t("music.decks.current")} size="lg" />
            <span className={styles.roomDeckCopy}>
              <span className={styles.deckName}>{t("music.decks.current")}</span>
              <span className={styles.deckMeta}>
                {t("music.decks.songs", { count: roomDeck.songCount })}
              </span>
              {roomDeck.toCheckCount > 0 ? (
                <Chip>{t("music.decks.toCheck", { count: roomDeck.toCheckCount })}</Chip>
              ) : null}
            </span>
            {roomDeck.isEditable ? <ChevronGlyph className={styles.chevron} /> : null}
          </button>
          {roomDeck.isEditable ? (
            <div className={styles.roomDeckActions}>
              <Button disabled={disabled} onClick={onSaveRoomDeck} variant="tertiary">
                {t("music.decks.save")}
              </Button>
              <Button disabled={disabled} onClick={onRemoveRoomDeck} variant="tertiary">
                {t("music.decks.removeAll")}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {savedDecks.length > 0 ? (
        <ul aria-label={t("music.tab.decks")} className={styles.deckGrid}>
          {savedDecks.map((deck) => (
            <li className={styles.deckTile} key={deck.id}>
              <button
                className={styles.deckTileButton}
                disabled={disabled}
                onClick={() => onUseDeck(deck)}
                type="button"
              >
                <CoverArt label={deck.name} mosaic={deck.coverUrls} size="lg" />
                <span className={styles.deckName}>{deck.name}</span>
                <span className={styles.deckMeta}>
                  {t("music.decks.songs", { count: deck.songCount })}
                </span>
                {deck.toCheckCount > 0 ? (
                  <Chip>{t("music.decks.toCheck", { count: deck.toCheckCount })}</Chip>
                ) : null}
              </button>
              <IconButton
                aria-label={t("music.decks.more", { name: deck.name })}
                className={styles.deckMore}
                disabled={disabled}
                onClick={() => onDeckOptions(deck)}
                variant="ghost"
              >
                <MoreGlyph />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          action={
            <Button onClick={onFind} variant="secondary">
              {t("music.decks.find")}
            </Button>
          }
          title={t("music.decks.empty")}
        />
      )}

      {statusMessage ? (
        <p className={styles.statusLine} role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
