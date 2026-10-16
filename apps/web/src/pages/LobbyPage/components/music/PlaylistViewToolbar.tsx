import { useI18n } from "../../../../features/i18n";
import { classNames } from "../../../../features/ui/classNames";
import { ChipButton } from "../../../../features/ui/primitives";
import {
  PLAYLIST_SORTS,
  type PlaylistSort,
  type UsePlaylistEditorResult,
} from "../../hooks/usePlaylistEditor";
import styles from "./playlistView.module.css";

/** The filter on the left, the sort on the right, floating under the cover. */
export function PlaylistViewToolbar({ editor }: { editor: UsePlaylistEditorResult }) {
  const { t } = useI18n();
  const { filter, setFilter } = editor;

  return (
    <>
      <div aria-label={t("music.filter.label")} className={styles.filters} role="group">
        <ChipButton
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
          selected={filter === "all"}
        >
          {t("music.filter.all", { count: editor.allTracks.length })}
        </ChipButton>
        <ChipButton
          aria-pressed={filter === "needsCheck"}
          onClick={() => setFilter("needsCheck")}
          selected={filter === "needsCheck"}
        >
          {t("music.filter.needsCheck", { count: editor.needsCheckCount })}
        </ChipButton>
      </div>
      <PlaylistSortSelect onChange={editor.setSort} value={editor.sort} />
    </>
  );
}

interface PlaylistSortSelectProps {
  onChange: (sort: PlaylistSort) => void;
  value: PlaylistSort;
}

/**
 * A sort icon over a native select: one tap target in the toolbar, and the phone's own picker
 * for the choice. It turns green while the songs are not in the list's own order.
 */
function PlaylistSortSelect({ onChange, value }: PlaylistSortSelectProps) {
  const { t } = useI18n();

  return (
    <label
      className={classNames(styles.sort, value === "original" ? undefined : styles.sortActive)}
      title={t(`music.sort.${value}`)}
    >
      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path
          d="M7 5v14M7 19l-3-3M7 19l3-3M17 19V5M17 5l-3 3M17 5l3 3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <select
        aria-label={t("music.sort.label")}
        className={styles.sortSelect}
        onChange={(event) => onChange(event.target.value as PlaylistSort)}
        value={value}
      >
        {PLAYLIST_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`music.sort.${sort}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
