import { useI18n } from "../../../../features/i18n";
import type { PlaceCardActionStatus } from "../../GamePage.types";
import { PrimaryActionButton } from "../ActionDock";
import { TurnActionSlot } from "./TurnActionSlot";

interface ConfirmPlacementActionProps {
  actionStatus: PlaceCardActionStatus;
  handlePlaceCard: () => void;
  isFullWidth: boolean;
  isPending: boolean;
}

const LABEL_KEY_BY_STATUS = {
  idle: "game.controls.confirm",
  pending: "game.controls.placementPending",
  retrying: "game.controls.placementRetrying",
  failed: "game.controls.retryPlacement",
} as const;

export function ConfirmPlacementAction({
  actionStatus,
  handlePlaceCard,
  isFullWidth,
  isPending,
}: ConfirmPlacementActionProps) {
  const { t } = useI18n();

  return (
    <TurnActionSlot isFullWidth={isFullWidth}>
      <PrimaryActionButton disabled={isPending} onClick={() => handlePlaceCard()}>
        {t(LABEL_KEY_BY_STATUS[actionStatus])}
      </PrimaryActionButton>
    </TurnActionSlot>
  );
}
