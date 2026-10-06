import type { PublicRoomState } from "@tunetrack/shared";
import { useState } from "react";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import { useI18n } from "../../../features/i18n";
import type { ConfirmRevealActionStatus } from "../GamePage.types";
import { ActionDock, PrimaryActionButton } from "./ActionDock";

interface RevealActionDockProps {
  canConfirmReveal: boolean;
  confirmRevealActionStatus: ConfirmRevealActionStatus;
  handleConfirmReveal: () => void;
  isConfirmRevealPending: boolean;
  roomState: PublicRoomState;
}

export function RevealActionDock({
  canConfirmReveal,
  confirmRevealActionStatus,
  handleConfirmReveal,
  isConfirmRevealPending,
  roomState,
}: RevealActionDockProps) {
  const { t } = useI18n();
  const [nextSongHintAnchor, setNextSongHintAnchor] = useState<HTMLElement | null>(null);

  if (roomState.status !== "reveal" || !canConfirmReveal) {
    return null;
  }

  let buttonLabel = t("game.controls.nextSong");
  if (confirmRevealActionStatus === "pending") {
    buttonLabel = t("game.controls.nextSongPending");
  } else if (confirmRevealActionStatus === "retrying") {
    buttonLabel = t("game.controls.nextSongRetrying");
  } else if (confirmRevealActionStatus === "failed") {
    buttonLabel = t("game.controls.retryNextSong");
  }

  return (
    <ActionDock containerRef={setNextSongHintAnchor}>
      <PrimaryActionButton disabled={isConfirmRevealPending} onClick={handleConfirmReveal}>
        {buttonLabel}
      </PrimaryActionButton>
      <FirstRunHint anchor={nextSongHintAnchor} id="game-next-song" isEligible />
    </ActionDock>
  );
}
