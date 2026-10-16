import { forwardRef } from "react";
import { useI18n } from "../../../features/i18n";
import { Button, ChipButton } from "../../../features/ui/primitives";
import type { PracticeDeckChoiceStatus } from "../hooks/spotify/usePracticeDeckChoice";
import type {
  LobbyDeckMeter as LobbyDeckMeterModel,
  LobbyMusicStatus,
} from "../hooks/lobbySetupModel";
import { LobbyCardButton } from "./LobbyCardButton";
import { LobbyDeckMeter } from "./LobbyDeckMeter";
import styles from "./LobbyMusicCard.module.css";

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface LobbyMusicCardProps {
  deckMeter: LobbyDeckMeterModel | null;
  music: LobbyMusicStatus;
  /** Opens the song editor on the songs whose year needs a look. */
  onCheckSongs: () => void;
  onOpen: () => void;
  onUsePracticeDeck: () => void;
  practiceDeckStatus: PracticeDeckChoiceStatus;
  tracksToCheckCount: number;
}

/** The host's music: the whole card opens Music setup (`22` §4.6). */
export const LobbyMusicCard = forwardRef<HTMLElement, LobbyMusicCardProps>(function LobbyMusicCard(
  {
    deckMeter,
    music,
    onCheckSongs,
    onOpen,
    onUsePracticeDeck,
    practiceDeckStatus,
    tracksToCheckCount,
  },
  ref,
) {
  const { t } = useI18n();
  const hasDeck = music.kind !== "none";

  return (
    <section aria-label={t("lobby.music.title")} className={styles.group} ref={ref}>
      <LobbyCardButton
        icon={<MusicGlyph />}
        onClick={onOpen}
        status={hasDeck ? getMusicStatusText(music, t) : t("lobby.music.choose")}
        title={t("lobby.music.title")}
        tone={hasDeck ? "default" : "attention"}
      />
      {deckMeter ? <LobbyDeckMeter meter={deckMeter} /> : null}
      {tracksToCheckCount > 0 ? (
        <ChipButton className={styles.toCheck} onClick={onCheckSongs}>
          {t("lobby.music.toCheck", { count: tracksToCheckCount })}
        </ChipButton>
      ) : null}
      {hasDeck ? null : (
        <>
          <Button
            fullWidth
            isLoading={practiceDeckStatus === "pending"}
            loadingLabel={t("lobby.practiceDeck.pending")}
            onClick={onUsePracticeDeck}
            variant="secondary"
          >
            {t("lobby.practiceDeck.use")}
          </Button>
          {practiceDeckStatus === "failed" ? (
            <p className={styles.failed} role="alert">
              {t("lobby.practiceDeck.failed")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
});

interface LobbyMusicSummaryProps {
  hostName: string | null;
  music: LobbyMusicStatus;
}

/** The same card for a guest: what will play and on whose phone, without a way in. */
export function LobbyMusicSummary({ hostName, music }: LobbyMusicSummaryProps) {
  const { t } = useI18n();
  const host = hostName ?? t("lobby.players.host");

  return (
    <LobbyCardButton
      icon={<MusicGlyph />}
      isStatic
      status={
        music.kind === "none"
          ? t("lobby.music.guestChoosing", { host })
          : t("lobby.music.guestReady", { count: music.songCount, host })
      }
      title={t("lobby.music.title")}
    />
  );
}

export function getMusicStatusText(music: LobbyMusicStatus, t: Translate): string {
  switch (music.kind) {
    case "none":
      return t("lobby.music.none");
    case "practice":
      return t("lobby.practiceDeck.status", { count: music.songCount });
    case "spotifyUnconnected":
      return t("lobby.music.spotifyUnconnected", { count: music.songCount });
    case "spotifyPremium":
      return t("lobby.music.spotifyPremium", { count: music.songCount });
    case "spotifyFree":
      return t("lobby.music.spotifyFree", { count: music.songCount });
  }
}

function MusicGlyph() {
  return (
    <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path
        d="M9 18V6L20 4V16M9 18A3 3 0 1 1 3 18A3 3 0 0 1 9 18ZM20 16A3 3 0 1 1 14 16A3 3 0 0 1 20 16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
