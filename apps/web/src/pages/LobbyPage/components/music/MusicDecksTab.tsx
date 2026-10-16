import type { PublicTrackInfo } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import {
  Button,
  Chip,
  CoverArt,
  EmptyState,
  IconButton,
  ListRowButton,
} from "../../../../features/ui/primitives";
import { resolveArtworkUrl } from "../../../../features/ui/resolveArtworkUrl";
import type { SavedDeckSummary } from "../../hooks/music/musicSetupSelectors";
import type { PlaylistEditorFilter } from "../../hooks/music/playlistEditorTarget";
import { CheckGlyph, MoreGlyph } from "./musicGlyphs";
import styles from "./music.module.css";
import deckStyles from "./musicDecks.module.css";

export interface RoomDeckSummary {
  coverUrls: readonly string[];
  /** The room deck opens the song editor; the practice deck has nothing to edit. */
  isEditable: boolean;
  songCount: number;
  /** The first songs whose year needs a look, each one tap from its editor. */
  songsToCheck: readonly PublicTrackInfo[];
  toCheckCount: number;
}

interface MusicDecksTabProps {
  disabled: boolean;
  onDeckOptions: (deck: SavedDeckSummary) => void;
  onEditDeck: (deck: SavedDeckSummary) => void;
  onEditRoomDeck: (filter: PlaylistEditorFilter, trackId?: string) => void;
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
  onEditDeck,
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
        <RoomDeckCard
          deck={roomDeck}
          disabled={disabled}
          onEdit={onEditRoomDeck}
          onRemove={onRemoveRoomDeck}
          onSave={onSaveRoomDeck}
        />
      ) : null}

      {savedDecks.length > 0 ? (
        <ul aria-label={t("music.tab.decks")} className={deckStyles.deckGrid}>
          {savedDecks.map((deck) => (
            <li className={deckStyles.deckTile} key={deck.id}>
              {/* Initials stand in for a deck with no song covers yet. */}
              <CoverArt
                className={deckStyles.deckCover}
                label={deck.name}
                mosaic={deck.coverUrls}
                size="lg"
              />
              <span className={deckStyles.deckName}>{deck.name}</span>
              <span className={deckStyles.deckMeta}>
                {t("music.decks.songs", { count: deck.songCount })}
              </span>
              {deck.toCheckCount > 0 ? (
                <Chip>{t("music.decks.toCheck", { count: deck.toCheckCount })}</Chip>
              ) : null}
              <div className={deckStyles.deckTileActions}>
                <Button
                  aria-label={t("music.decks.loadLabel", { name: deck.name })}
                  disabled={disabled}
                  onClick={() => onUseDeck(deck)}
                  size="md"
                  variant="secondary"
                >
                  {t("music.decks.load")}
                </Button>
                <Button
                  aria-label={t("music.decks.editLabel", { name: deck.name })}
                  disabled={disabled}
                  onClick={() => onEditDeck(deck)}
                  size="md"
                  variant="tertiary"
                >
                  {t("music.decks.edit")}
                </Button>
              </div>
              <IconButton
                aria-label={t("music.decks.more", { name: deck.name })}
                className={deckStyles.deckMore}
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

interface RoomDeckCardProps {
  deck: RoomDeckSummary;
  disabled: boolean;
  onEdit: (filter: PlaylistEditorFilter, trackId?: string) => void;
  onRemove: () => void;
  onSave: () => void;
}

/** What the game will play: how many songs, which years to check, and the way into the editor. */
function RoomDeckCard({ deck, disabled, onEdit, onRemove, onSave }: RoomDeckCardProps) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="music-room-deck-title" className={deckStyles.roomDeck}>
      <div className={deckStyles.roomDeckHead}>
        <CoverArt label="♪" mosaic={deck.coverUrls} size="md" />
        <div className={deckStyles.roomDeckCopy}>
          <h3 className={deckStyles.deckName} id="music-room-deck-title">
            {t("music.decks.current")}
          </h3>
          <span className={deckStyles.deckMeta}>
            {t("music.decks.songs", { count: deck.songCount })}
          </span>
        </div>
      </div>

      {deck.isEditable ? (
        <RoomDeckCheck deck={deck} disabled={disabled} onEdit={onEdit} />
      ) : (
        <p className={styles.statusLine}>{t("music.decks.practiceNote")}</p>
      )}

      {deck.isEditable ? (
        <div className={deckStyles.roomDeckActions}>
          <Button disabled={disabled} fullWidth onClick={() => onEdit("all")} variant="secondary">
            {t("music.decks.editSongs")}
          </Button>
          <div className={deckStyles.roomDeckSecondary}>
            <Button disabled={disabled} onClick={onSave} variant="tertiary">
              {t("music.decks.save")}
            </Button>
            <Button disabled={disabled} onClick={onRemove} variant="tertiary">
              {t("music.decks.removeAll")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RoomDeckCheck({
  deck,
  disabled,
  onEdit,
}: {
  deck: RoomDeckSummary;
  disabled: boolean;
  onEdit: (filter: PlaylistEditorFilter, trackId?: string) => void;
}) {
  const { t } = useI18n();

  if (deck.toCheckCount === 0) {
    return (
      <p className={deckStyles.allChecked}>
        <CheckGlyph />
        {t("music.decks.allChecked")}
      </p>
    );
  }

  return (
    <div className={deckStyles.checkBlock}>
      <p className={deckStyles.checkLine}>
        {t("music.decks.toCheckLine", { count: deck.toCheckCount })}
      </p>
      {deck.songsToCheck.length > 0 ? (
        <ul className={deckStyles.checkList}>
          {deck.songsToCheck.map((track) => (
            <li key={track.id}>
              <ListRowButton
                disabled={disabled}
                leading={<CoverArt label={track.title} size="sm" src={resolveArtworkUrl(track)} />}
                onClick={() => onEdit("needsCheck", track.id)}
                subtitle={`${track.artist} · ${track.releaseYear}`}
                title={track.title}
                trailing={<Chip>{t("lobby.playlist.statusCheck")}</Chip>}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <Button disabled={disabled} fullWidth onClick={() => onEdit("needsCheck")} variant="primary">
        {t("music.decks.checkSongs", { count: deck.toCheckCount })}
      </Button>
    </div>
  );
}
