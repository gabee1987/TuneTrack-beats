import type { PublicPlayerState } from "@tunetrack/shared/client";
import { forwardRef, useId, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { Button, Dialog } from "../../../../features/ui/primitives";
import type { LobbyAssemblyModel } from "../../hooks/buildLobbyAssemblyModel";
import { RulesPlayerRow } from "./RulesPlayerRow";
import type { RulesNumberInput } from "./RulesNumberSetting";
import styles from "./rules.module.css";

interface RulesPlayersSectionProps {
  numberInput: RulesNumberInput;
  players: LobbyAssemblyModel["players"];
}

interface RemovalState {
  isOpen: boolean;
  player: PublicPlayerState | null;
}

/**
 * Everyone in the room. The host opens a row to set that player's starting songs and tokens,
 * or to remove them after a confirm (`22` §4.7, Players). Guests see the same list, read-only.
 */
export const RulesPlayersSection = forwardRef<HTMLElement, RulesPlayersSectionProps>(
  function RulesPlayersSection({ numberInput, players: model }, ref) {
    const { t } = useI18n();
    const titleId = useId();
    const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
    // The player stays set while the dialog plays its exit, so its title does not go blank.
    const [removal, setRemoval] = useState<RemovalState>({ isOpen: false, player: null });
    const isBusy = model.isKickPlayerPending || model.isPlayerSettingsPending;
    const isTokensOn = model.roomSettings.ttModeEnabled;

    function confirmRemoval() {
      if (removal.player) model.onPlayerKick(removal.player);
      setRemoval((current) => ({ ...current, isOpen: false }));
    }

    return (
      <section aria-labelledby={titleId} className={styles.section} ref={ref}>
        <h3 className={styles.sectionTitle} id={titleId}>
          {t("lobby.players.count", { count: model.players.length })}
        </h3>
        <ul className={styles.playerList}>
          {model.players.map((player) => (
            <RulesPlayerRow
              canAdjust={model.isHost}
              canRemove={model.isHost && player.id !== model.currentPlayerId}
              isBusy={isBusy}
              isOpen={openPlayerId === player.id}
              isSelf={player.id === model.currentPlayerId}
              isTokensOn={isTokensOn}
              key={player.id}
              kickStatus={getStatusFor(model.kickPlayerActionState, player.id)}
              numberInput={numberInput}
              onRemove={() => setRemoval({ isOpen: true, player })}
              onStartingSongsChange={(value) =>
                model.onPlayerStartingCardCountChange(player, value)
              }
              onStartingTokensChange={(value) =>
                model.onPlayerStartingTtTokenCountChange(player, value)
              }
              onToggle={() =>
                setOpenPlayerId((current) => (current === player.id ? null : player.id))
              }
              player={player}
              settingsStatus={getStatusFor(model.playerSettingsActionState, player.id)}
            />
          ))}
        </ul>
        <Dialog
          actions={
            <>
              <Button
                onClick={() => setRemoval((current) => ({ ...current, isOpen: false }))}
                variant="ghost"
              >
                {t("common.cancel")}
              </Button>
              <Button haptic onClick={confirmRemoval} variant="danger">
                {t("common.remove")}
              </Button>
            </>
          }
          closeLabel={t("common.close")}
          isOpen={removal.isOpen}
          onClose={() => setRemoval((current) => ({ ...current, isOpen: false }))}
          title={t("lobby.players.kickConfirm", { name: removal.player?.displayName ?? "" })}
        >
          <p className={styles.dialogBody}>{t("lobby.players.kickConfirmBody")}</p>
        </Dialog>
      </section>
    );
  },
);

function getStatusFor<Status>(
  state: { playerId: string; status: Status } | null,
  playerId: string,
): Status | null {
  return state?.playerId === playerId ? state.status : null;
}
