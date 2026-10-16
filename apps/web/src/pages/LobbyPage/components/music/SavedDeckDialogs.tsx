import { useState, type FormEvent } from "react";
import { useI18n } from "../../../../features/i18n";
import { Button, Dialog, TextField } from "../../../../features/ui/primitives";
import type { SavedDeckSummary } from "../../hooks/music/musicSetupSelectors";
import type { LobbySpotifySavedPlaylistsState } from "../../hooks/spotify/lobbySpotify.types";
import styles from "./music.module.css";

type DeckDialog = "closed" | "delete" | "options" | "rename";

interface SavedDeckDialogsProps {
  /** The deck whose More button was tapped; `null` keeps every dialog closed. */
  deck: SavedDeckSummary | null;
  onDone: () => void;
  savedPlaylists: LobbySpotifySavedPlaylistsState;
}

/** More → Rename or Delete for one saved deck; Delete always asks first. */
export function SavedDeckDialogs({ deck, onDone, savedPlaylists }: SavedDeckDialogsProps) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<DeckDialog>("closed");
  // The deck stays named while a dialog plays its exit after the parent cleared it.
  const [shownDeck, setShownDeck] = useState<SavedDeckSummary | null>(null);
  const [requestedDeckId, setRequestedDeckId] = useState<string | null>(null);
  const deckId = deck?.id ?? null;
  if (deckId !== requestedDeckId) {
    setRequestedDeckId(deckId);
    if (deck) {
      setShownDeck(deck);
      setDialog("options");
    }
  }
  const name = shownDeck?.name ?? "";

  function close() {
    if (dialog === "rename") savedPlaylists.cancelRenamePlaylist();
    setDialog("closed");
    onDone();
  }

  function startRename() {
    if (!shownDeck) return;
    savedPlaylists.startRenamePlaylist(shownDeck.id);
    setDialog("rename");
  }

  function confirmRename(event?: FormEvent) {
    event?.preventDefault();
    savedPlaylists.confirmRenamePlaylist();
  }

  // The controller clears the rename once it is saved; that ends the dialog too.
  if (dialog === "rename" && savedPlaylists.renamingPlaylistId === null && shownDeck) {
    setDialog("closed");
    onDone();
  }

  function confirmDelete() {
    if (shownDeck) savedPlaylists.deleteSavedPlaylistById(shownDeck.id);
    setDialog("closed");
    onDone();
  }

  return (
    <>
      <Dialog
        actions={
          <Button onClick={close} variant="ghost">
            {t("common.cancel")}
          </Button>
        }
        closeLabel={t("common.close")}
        isOpen={dialog === "options"}
        onClose={close}
        title={name}
      >
        <div className={styles.dialogActions}>
          <Button fullWidth onClick={startRename} variant="secondary">
            {t("music.decks.rename")}
          </Button>
          <Button fullWidth onClick={() => setDialog("delete")} variant="danger">
            {t("music.decks.delete")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        actions={
          <>
            <Button onClick={close} variant="ghost">
              {t("common.cancel")}
            </Button>
            <Button onClick={() => confirmRename()}>{t("music.decks.renameSave")}</Button>
          </>
        }
        closeLabel={t("common.close")}
        isOpen={dialog === "rename"}
        onClose={close}
        title={t("music.decks.renameTitle")}
      >
        <form onSubmit={confirmRename}>
          <TextField
            autoFocus
            error={savedPlaylists.renameError}
            label={t("music.decks.nameLabel")}
            onChange={(event) => savedPlaylists.setRenameInputValue(event.target.value)}
            value={savedPlaylists.renameInputValue}
          />
        </form>
      </Dialog>

      <Dialog
        actions={
          <>
            <Button onClick={close} variant="ghost">
              {t("common.cancel")}
            </Button>
            <Button haptic onClick={confirmDelete} variant="danger">
              {t("music.decks.delete")}
            </Button>
          </>
        }
        closeLabel={t("common.close")}
        isOpen={dialog === "delete"}
        onClose={close}
        title={t("music.decks.deleteConfirm", { name })}
      >
        <p className={styles.dialogBody}>{t("music.decks.deleteBody")}</p>
      </Dialog>
    </>
  );
}
