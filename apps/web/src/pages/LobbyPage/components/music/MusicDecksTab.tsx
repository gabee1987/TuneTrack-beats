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
  /** The id of the line that says why every action is held (offline), or `null`. */
  heldReasonId: string | null;
  onDeckOptions: (deck: SavedDeckSummary) => void;
  onEditDeck: (deck: SavedDeckSummary) => void;
  onEditRoomDeck: (filter: PlaylistEditorFilter) => void;
  onFind: () => void;
  /** A song from the room deck's "to check" list, opened on its own. */
  onOpenSong: (trackId: string) => void;
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
  heldReasonId,
  onDeckOptions,
  onEditDeck,
  onEditRoomDeck,
  onFind,
  onOpenSong,
  onRemoveRoomDeck,
  onSaveRoomDeck,
  onUseDeck,
  roomDeck,
  savedDecks,
  statusMessage,
}: MusicDecksTabProps) {
  const { t } = useI18n();
  const disabled = heldReasonId !== null;

  return (
    <div className={styles.tab}>
      {roomDeck ? (
        <RoomDeckCard
          deck={roomDeck}
          heldReasonId={heldReasonId}
          onEdit={onEditRoomDeck}
          onOpenSong={onOpenSong}
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
                {deck.toCheckCount > 0 ? (
                  <span className={deckStyles.deckToCheck}>
                    {t("music.decks.toCheck", { count: deck.toCheckCount })}
                  </span>
                ) : null}
              </span>
              <div className={deckStyles.deckTileActions}>
                <Button
                  aria-label={t("music.decks.loadLabel", { name: deck.name })}
                  aria-describedby={heldReasonId ?? undefined}
                  disabled={disabled}
                  onClick={() => onUseDeck(deck)}
                  size="md"
                  variant="primary"
                >
                  {t("music.decks.load")}
                </Button>
                <Button
                  aria-label={t("music.decks.editLabel", { name: deck.name })}
                  disabled={disabled}
                  onClick={() => onEditDeck(deck)}
                  size="md"
                  variant="secondary"
                >
                  {t("music.decks.edit")}
                </Button>
                <IconButton
                  aria-label={t("music.decks.more", { name: deck.name })}
                  disabled={disabled}
                  onClick={() => onDeckOptions(deck)}
                  variant="ghost"
                >
                  <MoreGlyph />
                </IconButton>
              </div>
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
  heldReasonId: string | null;
  onEdit: (filter: PlaylistEditorFilter) => void;
  onOpenSong: (trackId: string) => void;
  onRemove: () => void;
  onSave: () => void;
}

/** What the game will play: how many songs, which years to check, and the way into the editor. */
function RoomDeckCard({
  deck,
  heldReasonId,
  onEdit,
  onOpenSong,
  onRemove,
  onSave,
}: RoomDeckCardProps) {
  const { t } = useI18n();
  const disabled = heldReasonId !== null;

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
        <RoomDeckCheck
          deck={deck}
          heldReasonId={heldReasonId}
          onEdit={onEdit}
          onOpenSong={onOpenSong}
        />
      ) : (
        <p className={styles.statusLine}>{t("music.decks.practiceNote")}</p>
      )}

      {deck.isEditable ? (
        <div className={deckStyles.roomDeckActions}>
          <Button
            aria-describedby={heldReasonId ?? undefined}
            disabled={disabled}
            fullWidth
            onClick={() => onEdit("all")}
            variant="secondary"
          >
            {t("music.decks.editSongs")}
          </Button>
          <div className={deckStyles.roomDeckSecondary}>
            <Button disabled={disabled} fullWidth onClick={onSave} variant="tertiary">
              {t("music.decks.save")}
            </Button>
            <Button disabled={disabled} fullWidth onClick={onRemove} variant="tertiary">
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
  heldReasonId,
  onEdit,
  onOpenSong,
}: {
  deck: RoomDeckSummary;
  heldReasonId: string | null;
  onEdit: (filter: PlaylistEditorFilter) => void;
  onOpenSong: (trackId: string) => void;
}) {
  const { t } = useI18n();
  const disabled = heldReasonId !== null;

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
                onClick={() => onOpenSong(track.id)}
                subtitle={`${track.artist} · ${track.releaseYear}`}
                title={track.title}
                trailing={<Chip>{t("lobby.playlist.statusCheck")}</Chip>}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        aria-describedby={heldReasonId ?? undefined}
        disabled={disabled}
        fullWidth
        onClick={() => onEdit("needsCheck")}
        variant="primary"
      >
        {t("music.decks.checkSongs", { count: deck.toCheckCount })}
      </Button>
    </div>
  );
}
