import { useId } from "react";
import type { PublicRoomSettings } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { usePracticeDeckChoice } from "../../hooks/spotify/usePracticeDeckChoice";
import setupShellStyles from "./spotifySetupShell.module.css";
import sharedStyles from "./spotifyShared.module.css";

interface LobbyPracticeDeckChoiceProps {
  currentSettings: PublicRoomSettings;
}

/** Offered only while the room has no deck; the host replaces it later through Choose songs. */
export function LobbyPracticeDeckChoice({ currentSettings }: LobbyPracticeDeckChoiceProps) {
  const { t } = useI18n();
  const descriptionId = useId();
  const { choosePracticeDeck, status } = usePracticeDeckChoice();

  if (currentSettings.deckSource === "practice") {
    return (
      <p className={sharedStyles.spotifyStatusLine}>
        {t("lobby.practiceDeck.status", { count: currentSettings.importedTrackCount })}
      </p>
    );
  }

  if (currentSettings.deckSource !== "none") return null;

  return (
    <>
      <ActionButton
        aria-describedby={descriptionId}
        disabled={status === "pending"}
        onClick={() => void choosePracticeDeck()}
        type="button"
        variant="neutral"
      >
        {status === "pending" ? t("lobby.practiceDeck.pending") : t("lobby.practiceDeck.use")}
      </ActionButton>
      <p className={setupShellStyles.spotifyConnectHint} id={descriptionId}>
        {t("lobby.practiceDeck.description")}
      </p>
      {status === "failed" ? (
        <p
          className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}
          role="alert"
        >
          {t("lobby.practiceDeck.failed")}
        </p>
      ) : null}
    </>
  );
}
