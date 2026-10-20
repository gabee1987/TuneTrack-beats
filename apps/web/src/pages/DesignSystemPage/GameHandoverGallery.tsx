import { useEffect, useState } from "react";
import { useI18n } from "../../features/i18n";
import { Button } from "../../features/ui/primitives";
import { GamePageToastStack } from "../GamePage/components/GamePageToastStack";
import { PlaybackNoticeChip } from "../GamePage/components/HostPlaybackChip";
import styles from "./DesignSystemPage.module.css";

type HandoverToast = "audio" | "silent" | null;

const GALLERY_TOAST_MS = 4000;
const noop = () => undefined;

/** What a game shows as it starts (`22` §4.11): the guests' toast and the host's playback notices. */
export function GameHandoverGallery() {
  const { t } = useI18n();
  const [toast, setToast] = useState<HandoverToast>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), GALLERY_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const message =
    toast === "audio"
      ? t("game.handover.guest", { host: "Player One" })
      : t("game.handover.guestNoAudio");

  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">Game handover</h2>
      <div className={styles.row}>
        <PlaybackNoticeChip kind="connecting" onStart={noop} />
        <PlaybackNoticeChip kind="tapToStart" onStart={noop} />
        <PlaybackNoticeChip kind="practice" onStart={noop} />
      </div>
      <div className={styles.row}>
        <Button onClick={() => setToast("audio")} variant="secondary">
          Guest toast: music
        </Button>
        <Button onClick={() => setToast("silent")} variant="secondary">
          Guest toast: practice deck
        </Button>
      </div>
      <GamePageToastStack
        toasts={toast ? [{ id: `handover-${toast}`, message, type: "info" }] : []}
      />
    </section>
  );
}
