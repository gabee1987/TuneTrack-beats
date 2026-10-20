import type { FormEvent } from "react";
import { useI18n } from "../../../../features/i18n";
import { Button, Dialog, TextField } from "../../../../features/ui/primitives";
import type { LobbySpotifySavedPlaylistsState } from "../../hooks/spotify/lobbySpotify.types";
import styles from "./music.module.css";

interface SaveDeckDialogProps {
  savedPlaylists: LobbySpotifySavedPlaylistsState;
}

/**
 * Saves the game's deck to this device. A deck that came from a saved one asks first whether to
 * update that deck or save a new one; both are buttons of the same dialog (`22` §4.9, Overflow).
 */
export function SaveDeckDialog({ savedPlaylists }: SaveDeckDialogProps) {
  const { t } = useI18n();
  const {
    cancelSavePlaylist,
    confirmOverwrite,
    confirmSavePlaylist,
    isOverwritePromptActive,
    isSavingWithName,
    loadedSavedPlaylistId,
    saveName,
    saveNameError,
    savedPlaylists: decks,
    setSaveName,
    switchToSaveAsNew,
  } = savedPlaylists;
  const loadedDeckName = decks.find((deck) => deck.id === loadedSavedPlaylistId)?.name ?? "";

  function save(event?: FormEvent) {
    event?.preventDefault();
    confirmSavePlaylist();
  }

  return (
    <>
      <Dialog
        actions={
          <>
            <Button onClick={cancelSavePlaylist} variant="ghost">
              {t("common.cancel")}
            </Button>
            <Button onClick={() => save()}>{t("music.decks.saveConfirm")}</Button>
          </>
        }
        closeLabel={t("common.close")}
        isOpen={isSavingWithName}
        onClose={cancelSavePlaylist}
        title={t("music.decks.saveTitle")}
      >
        <form onSubmit={save}>
          <TextField
            autoFocus
            error={saveNameError}
            label={t("music.decks.nameLabel")}
            onChange={(event) => setSaveName(event.target.value)}
            value={saveName}
          />
        </form>
      </Dialog>

      <Dialog
        actions={
          <Button onClick={cancelSavePlaylist} variant="ghost">
            {t("common.cancel")}
          </Button>
        }
        closeLabel={t("common.close")}
        isOpen={isOverwritePromptActive}
        onClose={cancelSavePlaylist}
        title={t("music.decks.saveTitle")}
      >
        <div className={styles.dialogActions}>
          <Button fullWidth onClick={confirmOverwrite}>
            {t("music.decks.overwrite", { name: loadedDeckName })}
          </Button>
          <Button fullWidth onClick={switchToSaveAsNew} variant="secondary">
            {t("music.decks.saveAsNew")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
