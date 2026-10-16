import type { FormEvent } from "react";
import { useI18n } from "../../../../features/i18n";
import { ChipButton, IconButton, TextField } from "../../../../features/ui/primitives";
import type { FindKind } from "../../hooks/music/musicSetupSelectors";
import type { MusicFindState } from "../../hooks/music/useMusicFind";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";
import { SearchIcon } from "../spotify/spotifySetupIcons";
import { MusicSearchResults } from "./MusicSearchResults";
import styles from "./music.module.css";
import findStyles from "./musicFind.module.css";

const FIND_KINDS: ReadonlyArray<{ kind: FindKind; labelKey: string }> = [
  { kind: "track", labelKey: "music.find.type.track" },
  { kind: "album", labelKey: "music.find.type.album" },
  { kind: "artist", labelKey: "music.find.type.artist" },
  { kind: "playlist", labelKey: "music.find.type.playlist" },
];

interface MusicFindTabProps {
  disabled: boolean;
  find: MusicFindState;
  spotify: UseLobbySpotifyResult;
}

/** Search Spotify or paste a link (`22` §4.8, Find); ready-made decks have their own tab. */
export function MusicFindTab({ disabled, find, spotify }: MusicFindTabProps) {
  const { t } = useI18n();
  const isBusy = disabled || find.isImporting;

  function submit(event: FormEvent) {
    event.preventDefault();
    find.submit();
  }

  return (
    <div className={styles.tab}>
      <form className={findStyles.findForm} onSubmit={submit} role="search">
        <TextField
          disabled={isBusy}
          error={find.importError}
          helper={find.isImporting ? t("music.find.importing") : undefined}
          label={t("music.find.label")}
          onChange={(event) => find.changeQuery(event.target.value)}
          placeholder={t("music.find.placeholder")}
          trailing={
            <IconButton
              aria-label={t("music.find.search")}
              disabled={isBusy || !find.query.trim()}
              type="submit"
              variant="ghost"
            >
              <SearchIcon />
            </IconButton>
          }
          type="search"
          value={find.query}
        />
        {find.query.trim() ? (
          <div aria-label={t("music.find.typeLabel")} className={findStyles.chips} role="group">
            {FIND_KINDS.map(({ kind, labelKey }) => (
              <ChipButton
                disabled={isBusy}
                key={kind}
                onClick={() => find.changeKind(kind)}
                selected={find.kind === kind}
              >
                {t(labelKey)}
              </ChipButton>
            ))}
          </div>
        ) : null}
      </form>

      <MusicSearchResults
        disabled={isBusy}
        find={find}
        onOpen={spotify.openedPlaylist.openSmartSearchPlaylist}
      />
    </div>
  );
}
