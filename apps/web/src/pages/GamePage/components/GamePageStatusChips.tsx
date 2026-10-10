import type { PublicRoomState } from "@tunetrack/shared/client";
import { useI18n } from "../../../features/i18n";
import { Chip } from "../../../features/ui/primitives";
import styles from "../gamePageChrome.module.css";

interface GamePageStatusChipsProps {
  roomId: string;
  showPhaseChip: boolean;
  showRoomCodeChip: boolean;
  showTurnNumberChip: boolean;
  status: PublicRoomState["status"];
  turnNumber: number | null | undefined;
}

export function GamePageStatusChips({
  roomId,
  showPhaseChip,
  showRoomCodeChip,
  showTurnNumberChip,
  status,
  turnNumber,
}: GamePageStatusChipsProps) {
  const { t } = useI18n();

  return (
    <div className={styles.headerChipRow}>
      {showRoomCodeChip ? <Chip>{t("game.header.roomChip", { roomId })}</Chip> : null}
      {showPhaseChip ? <Chip>{t(`game.phase.${status}`)}</Chip> : null}
      {showTurnNumberChip ? (
        <Chip className={styles.headerChipTurn}>
          {t("game.header.turnChip", { turnNumber: turnNumber ?? "-" })}
        </Chip>
      ) : null}
    </div>
  );
}
