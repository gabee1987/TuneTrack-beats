import { useI18n } from "../../../features/i18n";
import { Button } from "../../../features/ui/primitives";

interface LobbyExitButtonProps {
  isHost: boolean;
  onClick: () => void;
}

/** A visible way out besides Back (owner, 2026-10-16); it opens the same confirm dialog. */
export function LobbyExitButton({ isHost, onClick }: LobbyExitButtonProps) {
  const { t } = useI18n();

  return (
    <Button fullWidth onClick={onClick} variant="danger">
      {isHost ? t("lobby.exit.closeLabel") : t("lobby.exit.leaveLabel")}
    </Button>
  );
}
