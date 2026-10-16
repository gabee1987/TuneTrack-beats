import { useEffect, useRef } from "react";
import { useI18n } from "../../../features/i18n";
import { Button, Sheet } from "../../../features/ui/primitives";
import type { LobbyAssemblyModel } from "../hooks/buildLobbyAssemblyModel";
import { DEFAULT_RULES } from "../hooks/lobbySetupModel";
import { LobbyRoomSettingsStatus } from "./LobbyRoomSettingsStatus";
import { RulesGameSection } from "./rules/RulesGameSection";
import type { RulesNumberInput } from "./rules/RulesNumberSetting";
import { RulesPlayersSection } from "./rules/RulesPlayersSection";
import { RulesTokensSection } from "./rules/RulesTokensSection";
import styles from "./RulesSheet.module.css";

interface RulesSheetProps {
  /** Phones list the players here; the desktop lobby shows them beside the cards. */
  hasPlayers: boolean;
  /** "+N more" opens the sheet at the player list. */
  isAtPlayers: boolean;
  isOpen: boolean;
  model: LobbyAssemblyModel;
  /** The ruler on phones, steppers on desktop (decision 26). */
  numberInput: RulesNumberInput;
  onClose: () => void;
}

/** Game, tokens and players, applied as they change, so Done is the only way out (`22` §4.7). */
export function RulesSheet({
  hasPlayers,
  isAtPlayers,
  isOpen,
  model,
  numberInput,
  onClose,
}: RulesSheetProps) {
  const { t } = useI18n();
  const { hostSettings, players, setup } = model;
  const playersRef = useRef<HTMLElement | null>(null);
  const isDisabled = hostSettings.isRoomSettingsPending;

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
        <RulesGameSection
          disabled={isDisabled}
          numberInput={numberInput}
          onChange={hostSettings.onRoomSettingsChange}
          settings={hostSettings.currentSettings}
        />
        <RulesTokensSection
          disabled={isDisabled}
          numberInput={numberInput}
          onChange={hostSettings.onRoomSettingsChange}
          onToggleTokens={hostSettings.onToggleTtMode}
          settings={hostSettings.currentSettings}
        />
        <Button
          disabled={!setup.rules.isCustom || isDisabled}
          fullWidth
          onClick={resetToDefaults}
          variant="secondary"
        >
          {t("lobby.rules.reset")}
        </Button>
        {hasPlayers ? (
          <RulesPlayersSection numberInput={numberInput} players={players} ref={playersRef} />
        ) : null}
      </div>
    </Sheet>
  );
}
