import type { PublicRoomSettings } from "@tunetrack/shared/client";
import { useState } from "react";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import type { LobbySetupModel } from "../hooks/lobbySetupModel";
import { useLobbySpotify } from "../hooks/spotify/useLobbySpotify";
import { usePracticeDeckChoice } from "../hooks/spotify/usePracticeDeckChoice";
import { LobbyMusicCard } from "./LobbyMusicCard";
import { MusicSheet } from "./music/MusicSheet";

interface LobbyHostMusicProps {
  currentSettings: PublicRoomSettings;
  setup: LobbySetupModel;
}

/**
 * Step 2 for the host: the Music card and the Music setup it opens. `useLobbySpotify` lives
 * here for the whole lobby, because import and login results arrive while setup is closed.
 */
export function LobbyHostMusic({ currentSettings, setup }: LobbyHostMusicProps) {
  const spotifyState = useLobbySpotify();
  const practiceDeck = usePracticeDeckChoice();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [hintAnchor, setHintAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <LobbyMusicCard
        deckMeter={setup.deckMeter}
        music={setup.music}
        onOpen={() => setIsSetupOpen(true)}
        onUsePracticeDeck={() => void practiceDeck.choosePracticeDeck()}
        practiceDeckStatus={practiceDeck.status}
        ref={setHintAnchor}
        tracksToCheckCount={setup.tracksToCheckCount}
      />
      <FirstRunHint anchor={hintAnchor} id="lobby-spotify" isEligible={!setup.isMusicDone} />
      <MusicSheet
        currentSettings={currentSettings}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onUsePracticeDeck={() => void practiceDeck.choosePracticeDeck()}
        practiceDeckStatus={practiceDeck.status}
        setup={setup}
        spotify={spotifyState}
      />
    </>
  );
}
