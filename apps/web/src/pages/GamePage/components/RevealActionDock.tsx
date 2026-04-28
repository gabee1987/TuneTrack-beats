import type { PublicRoomState } from "@tunetrack/shared";
import { useI18n } from "../../../features/i18n";
import { ActionDock, PrimaryActionButton } from "./ActionDock";

interface RevealActionDockProps {
  canConfirmReveal: boolean;
  handleConfirmReveal: () => void;
  roomState: PublicRoomState;
}

export function RevealActionDock({
  canConfirmReveal,
  handleConfirmReveal,
  roomState,
}: RevealActionDockProps) {
  const { t } = useI18n();

  if (roomState.status !== "reveal" || !canConfirmReveal) {
    return null;
  }

  return (
    <ActionDock>
      <PrimaryActionButton onClick={handleConfirmReveal}>
        {t("game.controls.nextSong")}
      </PrimaryActionButton>
    </ActionDock>
  );
}
