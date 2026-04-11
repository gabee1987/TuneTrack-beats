import type { PublicRoomState } from "@tunetrack/shared";
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
  if (roomState.status !== "reveal" || !canConfirmReveal) {
    return null;
  }

  return (
    <ActionDock>
      <PrimaryActionButton onClick={handleConfirmReveal}>
        Confirm Reveal
      </PrimaryActionButton>
    </ActionDock>
  );
}
