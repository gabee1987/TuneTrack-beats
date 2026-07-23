import type { PublicRoomSettings, SpotifyPlaylistSearchItem } from "@tunetrack/shared";
import { useI18n } from "../../../../features/i18n";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { TextInput } from "../../../../features/ui/TextInput";
import { AdaptiveSelect } from "../AdaptiveSelect";
import { SpotifyLogo } from "./spotifySetupIcons";
import type { LobbySpotifyState } from "./spotifySetupTypes";
import styles from "./LobbySpotifySection.module.css";

interface SpotifySetupContentProps {
  currentSettings: PublicRoomSettings;
  spotifyState: LobbySpotifyState;
}

export function SpotifySetupContent({ currentSettings, spotifyState }: SpotifySetupContentProps) {
  const { t } = useI18n();
  const { auth, import: playlistImport, playlistSearch, queue, savedPlaylists } = spotifyState;
  const {
    authError,
    authPhase,
    cancelConnectSpotify,
    connectSpotify,
  } = auth;
  const {
    clearCurrentPlaylist,
    importError,
    importPhase,
    importPlaylist,
    importPlaylistSearchResult,
    playlistUrl,
    setPlaylistUrl,
  } = playlistImport;
  const {
    playlistSearchError,
    playlistSearchPhase,
    playlistSearchResults,
    searchSpotifyPlaylists,
    setPlaylistSearchQuery,
  } = playlistSearch;
  const { openEditModal } = queue;
  const {
    cancelRenamePlaylist,
    cancelSavePlaylist,
    confirmOverwrite,
    confirmRenamePlaylist,
    confirmSavePlaylist,
    deleteSelectedSavedPlaylist,
    isOverwritePromptActive,
    isSavingWithName,
    loadedSavedPlaylistId,
    renameError,
    renameInputValue,
    renamingPlaylistId,
    saveCurrentPlaylist,
    saveName,
    saveNameError,
    savedPlaylistMessage,
    savedPlaylists: savedPlaylistItems,
    selectedSavedPlaylistId,
    setRenameInputValue,
    setSaveName,
    setSelectedSavedPlaylistId,
    startRenamePlaylist,
    switchToSaveAsNew,
  } = savedPlaylists;

  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const isConnecting = authPhase === "connecting";
  const isImporting = importPhase === "importing";
  const isPlaylistSearching = playlistSearchPhase === "searching";
  const playlistImportAction = getPlaylistImportAction(playlistUrl);

  const savedPlaylistOptions = [
    { label: t("lobby.spotify.savedPlaylistSelectPlaceholder"), value: "" },
    ...savedPlaylistItems.map((playlist) => ({ label: playlist.name, value: playlist.id })),
  ];

  return (
    <div className={styles.spotifySetupContent}>
      {!isConnected ? (
        <div className={styles.spotifyConnectRow}>
          <div className={styles.spotifyConnectUnconnected}>
            {authPhase === "error" && authError ? (
              <div className={styles.spotifyAuthErrorBlock}>
                <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
                  {authError}
                </p>
                <ActionButton
                  className={styles.spotifyConnectBtn}
                  onClick={connectSpotify}
                  type="button"
                  variant="neutral"
                >
                  <SpotifyLogo />
                  {t("lobby.spotify.tryAgain")}
                </ActionButton>
              </div>
            ) : (
              <>
                <p className={styles.spotifyConnectHint}>
                  {isConnecting
                    ? t("lobby.spotify.connectingHint")
                    : t("lobby.spotify.unconnectedHint")}
                </p>
                <div className={styles.spotifyConnectActions}>
                  <ActionButton
                    className={styles.spotifyConnectBtn}
                    disabled={isConnecting}
                    onClick={connectSpotify}
                    type="button"
                    variant="neutral"
                  >
                    <SpotifyLogo />
                    {isConnecting ? t("lobby.spotify.connecting") : t("lobby.spotify.connect")}
                  </ActionButton>
                  {isConnecting ? (
                    <ActionButton
                      className={styles.spotifyConnectCancelBtn}
                      onClick={cancelConnectSpotify}
                      type="button"
                      variant="neutral"
                    >
                      {t("lobby.spotify.cancelConnect")}
                    </ActionButton>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isConnected ? (
        <div className={styles.spotifyImportContent}>
          <div className={styles.spotifyPlaylistEditorEntry}>
            <span className={styles.spotifyPlaylistEditorSummary}>
              {isImported && importPhase !== "error"
                ? t("lobby.spotify.tracksQueued", {
                    count: currentSettings.importedTrackCount,
                  })
                : t("lobby.spotify.tracksQueuedEmpty")}
            </span>
            <div className={styles.spotifyPlaylistEditorActions}>
              <ActionButton
                className={styles.spotifyPlaylistEditorBtn}
                disabled={!isImported || isImporting}
                onClick={openEditModal}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.editPlaylist")}
              </ActionButton>
              <ActionButton
                className={styles.spotifyPlaylistEditorBtn}
                disabled={!isImported || isImporting}
                onClick={saveCurrentPlaylist}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.savePlaylist")}
              </ActionButton>
              <ActionButton
                className={`${styles.spotifyPlaylistEditorBtn} ${styles.spotifyPlaylistClearBtn}`}
                disabled={!isImported || isImporting}
                onClick={clearCurrentPlaylist}
                type="button"
                variant="danger"
              >
                {t("lobby.spotify.clearPlaylist")}
              </ActionButton>
            </div>
          </div>

          {isImported && importPhase !== "error" ? (
            <div className={styles.spotifySongsReady}>
              <span className={styles.spotifySongsReadyDot} />
              <span>
                {t("lobby.spotify.tracksQueued", {
                  count: currentSettings.importedTrackCount,
                })}
              </span>
            </div>
          ) : null}

          <div className={styles.spotifyImportRow}>
            <TextInput
              disabled={isImporting || isPlaylistSearching}
              onChange={(e) => {
                setPlaylistUrl(e.target.value);
                setPlaylistSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (playlistImportAction === "import") importPlaylist();
                else searchSpotifyPlaylists();
              }}
              placeholder={t("lobby.spotify.playlistPlaceholder")}
              type="search"
              value={playlistUrl}
            />
            <ActionButton
              className={styles.spotifyImportBtn}
              disabled={!playlistUrl.trim() || isImporting || isPlaylistSearching}
              onClick={playlistImportAction === "import" ? importPlaylist : searchSpotifyPlaylists}
              type="button"
              variant="neutral"
            >
              {isImporting || isPlaylistSearching
                ? t("lobby.spotify.loading")
                : playlistImportAction === "import"
                  ? isImported
                    ? t("lobby.spotify.reload")
                    : t("lobby.spotify.import")
                  : t("lobby.spotify.searchPlaylists")}
            </ActionButton>
          </div>

          {playlistSearchPhase === "error" && playlistSearchError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {playlistSearchError}
            </p>
          ) : null}

          {playlistSearchResults.length > 0 ? (
            <div className={styles.spotifyImportSearchResults}>
              {playlistSearchResults.map((playlist) => (
                <SpotifyImportPlaylistResultRow
                  key={playlist.id}
                  onImport={() => importPlaylistSearchResult(playlist)}
                  playlist={playlist}
                />
              ))}
            </div>
          ) : null}

          {importPhase === "error" && importError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {importError}
            </p>
          ) : null}

          {isImported && importPhase !== "error" && !isImporting ? (
            isOverwritePromptActive ? (
              <div className={styles.savedPlaylistOverwriteRow}>
                <p className={styles.savedPlaylistOverwriteHint}>
                  {t("lobby.spotify.overwriteHint", {
                    name: savedPlaylistItems.find((p) => p.id === loadedSavedPlaylistId)?.name ?? "",
                  })}
                </p>
                <div className={styles.savedPlaylistOverwriteActions}>
                  <ActionButton
                    className={styles.spotifyEditBtn}
                    onClick={confirmOverwrite}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.overwritePlaylist")}
                  </ActionButton>
                  <ActionButton
                    className={styles.spotifyEditBtn}
                    onClick={switchToSaveAsNew}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.saveAsNew")}
                  </ActionButton>
                  <ActionButton
                    className={styles.spotifyEditBtn}
                    onClick={cancelSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
              </div>
            ) : isSavingWithName ? (
              <div className={styles.savedPlaylistNameGroup}>
                <div className={styles.savedPlaylistNameRow}>
                  <TextInput
                    autoFocus
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmSavePlaylist();
                      if (e.key === "Escape") cancelSavePlaylist();
                    }}
                    placeholder={t("lobby.spotify.savePlaylistNameLabel")}
                    value={saveName}
                  />
                  <ActionButton
                    className={styles.savedPlaylistNameConfirm}
                    onClick={confirmSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.confirmSave")}
                  </ActionButton>
                  <ActionButton
                    className={styles.savedPlaylistNameCancel}
                    onClick={cancelSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
                {saveNameError ? (
                  <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
                    {saveNameError}
                  </p>
                ) : null}
              </div>
            ) : null
          ) : null}

          {savedPlaylistItems.length > 0 ? (
            <div className={styles.savedPlaylistPanel}>
              <div className={styles.savedPlaylistField}>
                <span className={styles.savedPlaylistLabel}>
                  {t("lobby.spotify.savedPlaylistSelectLabel")}
                </span>
                <AdaptiveSelect
                  label={t("lobby.spotify.savedPlaylistSelectLabel")}
                  onChange={(value) => setSelectedSavedPlaylistId(value)}
                  options={savedPlaylistOptions}
                  value={selectedSavedPlaylistId}
                />
              </div>

              {selectedSavedPlaylistId ? (
                renamingPlaylistId === selectedSavedPlaylistId ? (
                  <div className={styles.savedPlaylistNameGroup}>
                    <div className={styles.savedPlaylistNameRow}>
                      <TextInput
                        autoFocus
                        onChange={(e) => setRenameInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRenamePlaylist();
                          if (e.key === "Escape") cancelRenamePlaylist();
                        }}
                        placeholder={t("lobby.spotify.renamePlaylistLabel")}
                        value={renameInputValue}
                      />
                      <ActionButton
                        className={styles.savedPlaylistNameConfirm}
                        onClick={confirmRenamePlaylist}
                        type="button"
                        variant="neutral"
                      >
                        {t("lobby.spotify.confirmRename")}
                      </ActionButton>
                      <ActionButton
                        className={styles.savedPlaylistNameCancel}
                        onClick={cancelRenamePlaylist}
                        type="button"
                        variant="neutral"
                      >
                        {t("common.cancel")}
                      </ActionButton>
                    </div>
                    {renameError ? (
                      <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
                        {renameError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.savedPlaylistActions}>
                    <ActionButton
                      onClick={() => startRenamePlaylist(selectedSavedPlaylistId)}
                      type="button"
                      variant="neutral"
                    >
                      {t("lobby.spotify.renamePlaylist")}
                    </ActionButton>
                    <ActionButton
                      onClick={deleteSelectedSavedPlaylist}
                      type="button"
                      variant="danger"
                    >
                      {t("lobby.spotify.deleteSavedPlaylist")}
                    </ActionButton>
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          {savedPlaylistMessage ? (
            <p className={styles.spotifyStatusLine}>{savedPlaylistMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PlaylistImportAction = "import" | "search";

export function getPlaylistImportAction(value: string): PlaylistImportAction {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "search";
  if (/^spotify:playlist:/i.test(trimmedValue)) return "import";
  if (/open\.spotify\.com\/playlist\//i.test(trimmedValue)) return "import";
  if (/^[a-zA-Z0-9]{22}$/.test(trimmedValue)) return "import";
  return "search";
}

interface SpotifyImportPlaylistResultRowProps {
  onImport: () => void;
  playlist: SpotifyPlaylistSearchItem;
}

export function SpotifyImportPlaylistResultRow({
  onImport,
  playlist,
}: SpotifyImportPlaylistResultRowProps) {
  return (
    <button className={styles.spotifyImportSearchResultRow} onClick={onImport} type="button">
      {playlist.imageUrl ? (
        <img
          alt=""
          className={styles.spotifySmartResultImage}
          loading="lazy"
          src={playlist.imageUrl}
        />
      ) : (
        <span className={styles.spotifyPlaylistImageFallback}>
          <SpotifyLogo />
        </span>
      )}
      <span className={styles.spotifyPlaylistMeta}>
        <strong>{playlist.name}</strong>
        <span>
          {playlist.ownerName} · {playlist.trackCount} tracks
        </span>
      </span>
    </button>
  );
}
