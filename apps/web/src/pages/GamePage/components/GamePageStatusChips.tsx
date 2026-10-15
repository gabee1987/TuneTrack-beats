import type { PublicRoomState } from "@tunetrack/shared/client";
import { useI18n } from "../../../features/i18n";
import { Chip } from "../../../features/ui/primitives";
import type { HostPlaybackNotice } from "../handoverNotices";
import styles from "../gamePageChrome.module.css";
import { HostPlaybackChip } from "./HostPlaybackChip";

interface GamePageStatusChipsProps {
  playbackNotice: HostPlaybackNotice;
  roomId: string;
  showPhaseChip: boolean;
  showRoomCodeChip: boolean;
  showTurnNumberChip: boolean;
  status: PublicRoomState["status"];
  turnNumber: number | null | undefined;
}

export function GamePageStatusChips({
  playbackNotice,
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
      <HostPlaybackChip notice={playbackNotice} />
    </div>
  );
}
