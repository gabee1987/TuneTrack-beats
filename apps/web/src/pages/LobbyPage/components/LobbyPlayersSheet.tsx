import { useI18n } from "../../../features/i18n";
import { Sheet } from "../../../features/ui/primitives";
import type { LobbyAssemblyModel } from "../hooks/buildLobbyAssemblyModel";
import { RulesPlayersSection } from "./rules/RulesPlayersSection";
import styles from "./RulesSheet.module.css";

interface LobbyPlayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  players: LobbyAssemblyModel["players"];
}

/** A guest's "+N more": everyone in the room and what they start with, read-only (`22` §4.5). */
export function LobbyPlayersSheet({ isOpen, onClose, players }: LobbyPlayersSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      eyebrow={t("lobby.players.title")}
      isOpen={isOpen}
      onClose={onClose}
      title={t("lobby.players.heading")}
    >
      <div className={styles.body}>
        <RulesPlayersSection numberInput="ruler" players={players} />
      </div>
    </Sheet>
  );
}
