import type { PublicRoomSettings, SpotifyPlaylistSearchItem } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { TextInput } from "../../../../features/ui/TextInput";
import { AdaptiveSelect } from "../AdaptiveSelect";
import { SpotifyLogo } from "./spotifySetupIcons";
import type { LobbySpotifyState } from "./spotifySetupTypes";
import setupShellStyles from "./spotifySetupShell.module.css";
import sharedStyles from "./spotifyShared.module.css";
import setupImportStyles from "./spotifySetupImport.module.css";
import discoveryStyles from "./spotifyDiscovery.module.css";

interface SpotifySetupContentProps {
  currentSettings: PublicRoomSettings;
  spotifyState: LobbySpotifyState;
}

export function SpotifySetupContent({ currentSettings, spotifyState }: SpotifySetupContentProps) {
  const { t } = useI18n();
  const { auth, import: playlistImport, playlistSearch, queue, savedPlaylists } = spotifyState;
  const { authError, authPhase, cancelConnectSpotify, connectSpotify } = auth;
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
    <div className={setupShellStyles.spotifySetupContent}>
      {!isConnected ? (
        <div className={setupShellStyles.spotifyConnectRow}>
          <div className={setupShellStyles.spotifyConnectUnconnected}>
            {authPhase === "error" && authError ? (
              <div className={setupShellStyles.spotifyAuthErrorBlock}>
                <p
                  className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}
                >
                  {authError}
                </p>
                <ActionButton
                  className={setupShellStyles.spotifyConnectBtn}
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
                <p className={setupShellStyles.spotifyConnectHint}>
                  {isConnecting
                    ? t("lobby.spotify.connectingHint")
                    : t("lobby.spotify.unconnectedHint")}
                </p>
                <div className={setupShellStyles.spotifyConnectActions}>
                  <ActionButton
                    className={setupShellStyles.spotifyConnectBtn}
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
                      className={setupShellStyles.spotifyConnectCancelBtn}
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
        <div className={setupImportStyles.spotifyImportContent}>
          <div className={setupImportStyles.spotifyPlaylistEditorEntry}>
            <span className={setupImportStyles.spotifyPlaylistEditorSummary}>
              {isImported && importPhase !== "error"
                ? t("lobby.spotify.tracksQueued", {
                    count: currentSettings.importedTrackCount,
                  })
                : t("lobby.spotify.tracksQueuedEmpty")}
            </span>
            <div className={setupImportStyles.spotifyPlaylistEditorActions}>
              <ActionButton
                className={setupImportStyles.spotifyPlaylistEditorBtn}
                disabled={!isImported || isImporting}
                onClick={openEditModal}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.editPlaylist")}
              </ActionButton>
              <ActionButton
                className={setupImportStyles.spotifyPlaylistEditorBtn}
                disabled={!isImported || isImporting}
                onClick={saveCurrentPlaylist}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.savePlaylist")}
              </ActionButton>
              <ActionButton
                className={`${setupImportStyles.spotifyPlaylistEditorBtn} ${setupImportStyles.spotifyPlaylistClearBtn}`}
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
            <div className={setupShellStyles.spotifySongsReady}>
              <span className={setupShellStyles.spotifySongsReadyDot} />
              <span>
                {t("lobby.spotify.tracksQueued", {
                  count: currentSettings.importedTrackCount,
                })}
              </span>
            </div>
          ) : null}

          <div className={setupImportStyles.spotifyImportRow}>
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
              className={setupImportStyles.spotifyImportBtn}
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
            <p className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}>
              {playlistSearchError}
            </p>
          ) : null}

          {playlistSearchResults.length > 0 ? (
            <div className={setupImportStyles.spotifyImportSearchResults}>
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
            <p className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}>
              {importError}
            </p>
          ) : null}

          {isImported && importPhase !== "error" && !isImporting ? (
            isOverwritePromptActive ? (
              <div className={setupImportStyles.savedPlaylistOverwriteRow}>
                <p className={setupImportStyles.savedPlaylistOverwriteHint}>
                  {t("lobby.spotify.overwriteHint", {
                    name:
                      savedPlaylistItems.find((p) => p.id === loadedSavedPlaylistId)?.name ?? "",
                  })}
                </p>
                <div className={setupImportStyles.savedPlaylistOverwriteActions}>
                  <ActionButton
                    className={setupImportStyles.spotifyEditBtn}
                    onClick={confirmOverwrite}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.overwritePlaylist")}
                  </ActionButton>
                  <ActionButton
                    className={setupImportStyles.spotifyEditBtn}
                    onClick={switchToSaveAsNew}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.saveAsNew")}
                  </ActionButton>
                  <ActionButton
                    className={setupImportStyles.spotifyEditBtn}
                    onClick={cancelSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
              </div>
            ) : isSavingWithName ? (
              <div className={setupImportStyles.savedPlaylistNameGroup}>
                <div className={setupImportStyles.savedPlaylistNameRow}>
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
                    className={setupImportStyles.savedPlaylistNameConfirm}
                    onClick={confirmSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.confirmSave")}
                  </ActionButton>
                  <ActionButton
                    className={setupImportStyles.savedPlaylistNameCancel}
                    onClick={cancelSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
                {saveNameError ? (
                  <p
                    className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}
                  >
                    {saveNameError}
                  </p>
                ) : null}
              </div>
            ) : null
          ) : null}

          {savedPlaylistItems.length > 0 ? (
            <div className={setupImportStyles.savedPlaylistPanel}>
              <div className={setupImportStyles.savedPlaylistField}>
                <span className={setupImportStyles.savedPlaylistLabel}>
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
                  <div className={setupImportStyles.savedPlaylistNameGroup}>
                    <div className={setupImportStyles.savedPlaylistNameRow}>
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
                        className={setupImportStyles.savedPlaylistNameConfirm}
                        onClick={confirmRenamePlaylist}
                        type="button"
                        variant="neutral"
                      >
                        {t("lobby.spotify.confirmRename")}
                      </ActionButton>
                      <ActionButton
                        className={setupImportStyles.savedPlaylistNameCancel}
                        onClick={cancelRenamePlaylist}
                        type="button"
                        variant="neutral"
                      >
                        {t("common.cancel")}
                      </ActionButton>
                    </div>
                    {renameError ? (
                      <p
                        className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}
                      >
                        {renameError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className={setupImportStyles.savedPlaylistActions}>
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
            <p className={sharedStyles.spotifyStatusLine}>{savedPlaylistMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PlaylistImportAction = "import" | "search";

function getPlaylistImportAction(value: string): PlaylistImportAction {
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

function SpotifyImportPlaylistResultRow({
  onImport,
  playlist,
}: SpotifyImportPlaylistResultRowProps) {
  return (
    <button
      className={setupImportStyles.spotifyImportSearchResultRow}
      onClick={onImport}
      type="button"
    >
      {playlist.imageUrl ? (
        <img
          alt=""
          className={discoveryStyles.spotifySmartResultImage}
          loading="lazy"
          src={playlist.imageUrl}
        />
      ) : (
        <span className={discoveryStyles.spotifyPlaylistImageFallback}>
          <SpotifyLogo />
        </span>
      )}
      <span className={discoveryStyles.spotifyPlaylistMeta}>
        <strong>{playlist.name}</strong>
        <span>
          {playlist.ownerName} · {playlist.trackCount} tracks
        </span>
      </span>
    </button>
  );
}
