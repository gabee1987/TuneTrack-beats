import type { ReactNode } from "react";
import { useI18n } from "../../../features/i18n";
import { ConnectionStatus } from "../../../features/rooms/ConnectionStatus";
import { PageHeader } from "../../../features/ui/primitives";

interface LobbyTopBarProps {
  isHost: boolean;
  /** Back asks first: the host closes the room, a guest leaves it (as the page's exit button). */
  onBack: () => void;
  /** After the connection chip: the app menu on desktop. */
  trailing?: ReactNode | undefined;
}

/** Back, "Lobby" and what this player does here, for both assemblies (`22` §4.4, §4.12). */
export function LobbyTopBar({ isHost, onBack, trailing }: LobbyTopBarProps) {
  const { t } = useI18n();

  return (
    <PageHeader
      backLabel={t("common.back")}
      eyebrow={t("lobby.eyebrow")}
      onBack={onBack}
      title={t(isHost ? "lobby.title.host" : "lobby.title.guest")}
      titleAs="h1"
      trailing={
        <>
          <ConnectionStatus />
          {trailing}
        </>
      }
    />
  );
}
