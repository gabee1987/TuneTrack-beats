import type { PublicPlayerState, PublicRoomSettings } from "@tunetrack/shared/client";
import { useState } from "react";
import { Card } from "../../features/ui/primitives";
import type { LobbyAssemblyModel } from "../LobbyPage/hooks/buildLobbyAssemblyModel";
import { DEFAULT_RULES } from "../LobbyPage/hooks/lobbySetupModel";
import { RulesGameSection } from "../LobbyPage/components/rules/RulesGameSection";
import type { RulesNumberInput } from "../LobbyPage/components/rules/RulesNumberSetting";
import { RulesPlayersSection } from "../LobbyPage/components/rules/RulesPlayersSection";
import { RulesTokensSection } from "../LobbyPage/components/rules/RulesTokensSection";
import styles from "./DesignSystemPage.module.css";

const SAMPLE_SETTINGS: PublicRoomSettings = {
  ...DEFAULT_RULES,
  deckSource: "practice",
  importedTrackCount: 0,
  playlistImported: false,
  spotifyAccountType: null,
  spotifyAuthStatus: "none",
  spotifyPlaybackGeneration: 0,
  spotifyPlaybackOwnerPlayerId: null,
  tracksToCheckCount: 0,
};

const SAMPLE_PLAYERS: PublicPlayerState[] = [
  { displayName: "Player One", id: "rules-player-1", isHost: true },
  { displayName: "Player Two", id: "rules-player-2", isHost: false },
  {
    connectionStatus: "disconnected" as const,
    displayName: "Player Three",
    id: "rules-player-3",
    isHost: false,
  },
].map((player) => ({
  connectionStatus: "connected",
  disconnectedAtEpochMs: null,
  reconnectExpiresAtEpochMs: null,
  startingTimelineCardCount: 1,
  ttTokenCount: 0,
  ...player,
}));

/** The Rules sheet's sections (`22` §4.7): ruler on phones, stepper on desktop, host and guest. */
export function RulesGallery() {
  return (
    <>
      <RulesSettingsDemo numberInput="ruler" title="Rules sheet · phone (ruler)" />
      <RulesSettingsDemo numberInput="stepper" title="Rules sheet · desktop (stepper)" />
      <section className={styles.section}>
        <h2 className="typeTitleMd">Rules sheet · players</h2>
        <Card>
          <RulesPlayersDemo isHost />
        </Card>
        <Card>
          <RulesPlayersDemo isHost={false} />
        </Card>
      </section>
    </>
  );
}

function RulesSettingsDemo({
  numberInput,
  title,
}: {
  numberInput: RulesNumberInput;
  title: string;
}) {
  const [settings, setSettings] = useState(SAMPLE_SETTINGS);

  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">{title}</h2>
      <Card>
        <div className={styles.stack}>
          <RulesGameSection
            disabled={false}
            numberInput={numberInput}
            onChange={setSettings}
            settings={settings}
          />
          <RulesTokensSection
            disabled={false}
            numberInput={numberInput}
            onChange={setSettings}
            onToggleTokens={(ttModeEnabled) => setSettings({ ...settings, ttModeEnabled })}
            settings={settings}
          />
        </div>
      </Card>
    </section>
  );
}

function RulesPlayersDemo({ isHost }: { isHost: boolean }) {
  const [players, setPlayers] = useState(SAMPLE_PLAYERS);
  const updatePlayer = (id: string, change: Partial<PublicPlayerState>) =>
    setPlayers((current) =>
      current.map((player) => (player.id === id ? { ...player, ...change } : player)),
    );
  const model: LobbyAssemblyModel["players"] = {
    currentPlayerId: isHost ? "rules-player-1" : "rules-player-2",
    isHost,
    isKickPlayerPending: false,
    isPlayerSettingsPending: false,
    kickPlayerActionState: null,
    onPlayerKick: (player) =>
      setPlayers((current) => current.filter((candidate) => candidate.id !== player.id)),
    onPlayerStartingCardCountChange: (player, startingTimelineCardCount) =>
      updatePlayer(player.id, { startingTimelineCardCount }),
    onPlayerStartingTtTokenCountChange: (player, ttTokenCount) =>
      updatePlayer(player.id, { ttTokenCount }),
    playerSettingsActionState: null,
    players,
    roomSettings: { ...SAMPLE_SETTINGS, ttModeEnabled: true },
  };

  return <RulesPlayersSection numberInput="ruler" players={model} />;
}
