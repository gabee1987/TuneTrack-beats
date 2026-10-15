import { lazy, Suspense, useEffect, useState } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared/client";
import { SpotifySetupModal } from "./SpotifySetupModal";
import type { LobbySpotifyState, SpotifySetupSource } from "./spotifySetupTypes";

// Host-only and opened on demand: the editor and its stylesheets stay out of the lobby chunk (05 D4).
async function loadPlaylistEditModal() {
  const module = await import("../PlaylistEditModal");
  return { default: module.PlaylistEditModal };
}

const PlaylistEditModal = lazy(loadPlaylistEditModal);

interface LobbyMusicSetupProps {
  currentSettings: PublicRoomSettings;
  isOpen: boolean;
  onClose: () => void;
  spotifyState: LobbySpotifyState;
}

/** Music setup and the playlist editor inside it; the caller owns `useLobbySpotify` for the lobby's life. */
export function LobbyMusicSetup({
  currentSettings,
  isOpen,
  onClose,
  spotifyState,
}: LobbyMusicSetupProps) {
  const [activeSource, setActiveSource] = useState<SpotifySetupSource>("playlistUrl");
  const isImported = currentSettings.playlistImported;
  const isEditModalOpen = spotifyState.queue.isEditModalOpen;
  const [hasOpenedEditModal, setHasOpenedEditModal] = useState(isEditModalOpen);

  if (isEditModalOpen && !hasOpenedEditModal) {
    setHasOpenedEditModal(true);
  }

  useEffect(() => {
    if (isImported) {
      void loadPlaylistEditModal();
    }
  }, [isImported]);

  useEffect(() => {
    if (isOpen && spotifyState.savedPlaylists.generatedPlaylistMessage) {
      setActiveSource("playlistUrl");
    }
  }, [isOpen, spotifyState.savedPlaylists.generatedPlaylistMessage]);

  return (
    <SpotifySetupModal
      activeSource={activeSource}
      currentSettings={currentSettings}
      isOpen={isOpen}
      onClose={onClose}
      onSourceChange={setActiveSource}
      spotifyState={spotifyState}
    >
      {hasOpenedEditModal ? (
        <Suspense fallback={null}>
          <PlaylistEditModal isOpen={isEditModalOpen} onClose={spotifyState.queue.closeEditModal} />
        </Suspense>
      ) : null}
    </SpotifySetupModal>
  );
}
