import type { PublicRoomSettings } from "@tunetrack/shared/client";
import { lazy, Suspense, useState } from "react";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import type { LobbySetupModel } from "../hooks/lobbySetupModel";
import { useMusicDeckEditor } from "../hooks/music/useMusicDeckEditor";
import { useLobbySpotify } from "../hooks/spotify/useLobbySpotify";
import { usePracticeDeckChoice } from "../hooks/spotify/usePracticeDeckChoice";
import { LobbyMusicCard } from "./LobbyMusicCard";
import type { MusicSetupPanes } from "./music/MusicSheet";

// Its own chunk (`22` §13): guests never load it, and the lobby paints before it arrives.
const MusicSheet = lazy(async () => {
  const module = await import("./music/MusicSheet");
  return { default: module.MusicSheet };
});

interface LobbyHostMusicProps {
  currentSettings: PublicRoomSettings;
  musicPanes: MusicSetupPanes;
  setup: LobbySetupModel;
}

/**
 * Step 2 for the host: the Music card and the Music setup it opens. `useLobbySpotify` lives
 * here for the whole lobby, because import and login results arrive while setup is closed.
 */
export function LobbyHostMusic({ currentSettings, musicPanes, setup }: LobbyHostMusicProps) {
  const spotifyState = useLobbySpotify();
  const practiceDeck = usePracticeDeckChoice();
  const deckEditor = useMusicDeckEditor(currentSettings);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [hintAnchor, setHintAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <LobbyMusicCard
        coverUrls={deckEditor.roomCovers}
        deckMeter={setup.deckMeter}
        music={setup.music}
        onCheckSongs={() => {
          setIsSetupOpen(true);
          spotifyState.queue.openEditor({ deck: "room", filter: "needsCheck" });
        }}
        onOpen={() => setIsSetupOpen(true)}
        onUsePracticeDeck={() => void practiceDeck.choosePracticeDeck()}
        practiceDeckStatus={practiceDeck.status}
        ref={setHintAnchor}
        tracksToCheckCount={setup.tracksToCheckCount}
      />
      <FirstRunHint anchor={hintAnchor} id="lobby-music" isEligible={!setup.isMusicDone} />
      <Suspense fallback={null}>
        <MusicSheet
          currentSettings={currentSettings}
          deckEditor={deckEditor}
          isOpen={isSetupOpen}
          panes={musicPanes}
          onClose={() => setIsSetupOpen(false)}
          onUsePracticeDeck={() => void practiceDeck.choosePracticeDeck()}
          practiceDeckStatus={practiceDeck.status}
          setup={setup}
          spotify={spotifyState}
        />
      </Suspense>
    </>
  );
}
