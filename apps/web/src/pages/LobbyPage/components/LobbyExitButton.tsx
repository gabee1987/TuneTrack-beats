import { useI18n } from "../../../features/i18n";
import { Button } from "../../../features/ui/primitives";

interface LobbyExitButtonProps {
  isHost: boolean;
  onClick: () => void;
}

/**
 * A visible way out besides Back (owner, 2026-10-16); it opens the same confirm dialog. Large
 * and full width like Start, so the two read as one pair wherever they sit.
 */
export function LobbyExitButton({ isHost, onClick }: LobbyExitButtonProps) {
  const { t } = useI18n();

  return (
    <Button fullWidth onClick={onClick} size="lg" variant="danger">
      {isHost ? t("lobby.exit.closeLabel") : t("lobby.exit.leaveLabel")}
    </Button>
  );
}
