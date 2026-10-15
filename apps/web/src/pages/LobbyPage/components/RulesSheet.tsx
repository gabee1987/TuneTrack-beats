import { useEffect, useRef } from "react";
import { useI18n } from "../../../features/i18n";
import { Button, Sheet } from "../../../features/ui/primitives";
import type { LobbyAssemblyModel } from "../hooks/buildLobbyAssemblyModel";
import { DEFAULT_RULES } from "../hooks/lobbySetupModel";
import { LobbyHostCoreSettings } from "./LobbyHostCoreSettings";
import { LobbyHostTtSettings } from "./LobbyHostTtSettings";
import { LobbyPlayerList } from "./LobbyPlayerList";
import { LobbyRoomSettingsStatus } from "./LobbyRoomSettingsStatus";
import styles from "./RulesSheet.module.css";

interface RulesSheetProps {
  /** "+N more" opens the sheet at the player list. */
  isAtPlayers: boolean;
  isOpen: boolean;
  model: LobbyAssemblyModel;
  onClose: () => void;
}

/**
 * Game rules, tokens and players, applied as they change, so Done is the only way out. S3 hosts
 * the existing settings blocks here; S4 rebuilds the sections (`22` §4.7).
 */
export function RulesSheet({ isAtPlayers, isOpen, model, onClose }: RulesSheetProps) {
  const { t } = useI18n();
  const { hostSettings, players, setup } = model;
  const playersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && isAtPlayers) playersRef.current?.scrollIntoView({ block: "start" });
  }, [isAtPlayers, isOpen]);

  function resetToDefaults() {
    hostSettings.onRoomSettingsChange({ ...hostSettings.currentSettings, ...DEFAULT_RULES });
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} onDone={onClose} title={t("lobby.rules.title")}>
      <div className={styles.body}>
        <p className={styles.intro}>{t("lobby.rules.autoSave")}</p>
        <LobbyRoomSettingsStatus actionStatus={hostSettings.roomSettingsActionStatus} />
        <LobbyHostCoreSettings
          currentSettings={hostSettings.currentSettings}
          disabled={hostSettings.isRoomSettingsPending}
          onRoomSettingsChange={hostSettings.onRoomSettingsChange}
        />
        <LobbyHostTtSettings
          currentSettings={hostSettings.currentSettings}
          disabled={hostSettings.isRoomSettingsPending}
          onRoomSettingsChange={hostSettings.onRoomSettingsChange}
          onToggleTtMode={hostSettings.onToggleTtMode}
        />
        <Button
          disabled={!setup.rules.isCustom || hostSettings.isRoomSettingsPending}
          fullWidth
          onClick={resetToDefaults}
          variant="secondary"
        >
          {t("lobby.rules.reset")}
        </Button>
        <div ref={playersRef}>
          <LobbyPlayerList
            currentPlayerId={players.currentPlayerId}
            isHost={players.isHost}
            isKickPlayerPending={players.isKickPlayerPending}
            isPlayerSettingsPending={players.isPlayerSettingsPending}
            kickPlayerActionState={players.kickPlayerActionState}
            onPlayerKick={players.onPlayerKick}
            onPlayerStartingCardCountChange={players.onPlayerStartingCardCountChange}
            onPlayerStartingTtTokenCountChange={players.onPlayerStartingTtTokenCountChange}
            playerSettingsActionState={players.playerSettingsActionState}
            players={players.players}
            roomSettings={players.roomSettings}
          />
        </div>
      </div>
    </Sheet>
  );
}
