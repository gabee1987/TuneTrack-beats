import { useId, useMemo, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import {
  CollapsingHeaderBar,
  CollapsingHeaderCompact,
  CollapsingHeaderHero,
  useCollapsingHeader,
} from "../../../../features/motion";
import { PanelView } from "../../../../features/overlay";
import {
  Button,
  CoverArt,
  FloatingBar,
  ListSkeleton,
  PageHeader,
  SelectionActionBar,
  type SelectionAction,
} from "../../../../features/ui/primitives";
import { pickDeckCovers } from "../../hooks/music/musicSetupSelectors";
import { needsYearCheck } from "../../hooks/music/playlistEditorTarget";
import type { PlaylistViewModel } from "../../hooks/music/usePlaylistView";
import { useSongReview } from "../../hooks/music/useSongReview";
import { usePlaylistEditor, type UsePlaylistEditorResult } from "../../hooks/usePlaylistEditor";
import { PlaylistTrackDetailsSheet } from "../PlaylistTrackDetailsSheet";
import { getAddRemoveActions } from "./addRemoveActions";
import { PlaylistViewList } from "./PlaylistViewList";
import { PlaylistViewToolbar } from "./PlaylistViewToolbar";
import styles from "./playlistView.module.css";

/** How far the list scrolls before the big cover has folded into the bar. */
const COLLAPSE_DISTANCE_PX = 180;

interface PlaylistViewProps {
  /** The list to show; `null` closes the view. */
  view: PlaylistViewModel | null;
}

/**
 * The one view for every list of songs (`22` §4.9): a deck in this game or saved here, what
 * Find opened, a quick pick. A view over the Music sheet, so Back steps out one level.
 */
export function PlaylistView({ view }: PlaylistViewProps) {
  const { t } = useI18n();

  return (
    <PanelView
      isOpen={view !== null}
      label={t("music.view.label")}
      onDismiss={view?.onBack ?? noop}
    >
      {view ? <PlaylistViewContent key={view.listKey} view={view} /> : null}
    </PanelView>
  );
}

function PlaylistViewContent({ view }: { view: PlaylistViewModel }) {
  const { t } = useI18n();
  const editor = usePlaylistEditor(view.source, view.initialFilter);
  const songs = useSongReview();
  // The list measures the scroller as it mounts, before a parent's ref is set: state re-renders it.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const collapse = useCollapsingHeader(scrollElement, COLLAPSE_DISTANCE_PX);

  const { allTracks } = editor;
  const covers = useMemo(() => pickDeckCovers(allTracks), [allTracks]);
  // Looked up in every song: a checked song leaves the Needs check list while it is open.
  const openTrack = allTracks.find((track) => track.id === songs.openTrackId) ?? null;
  const cover = {
    label: view.name,
    mosaic: view.coverUrl ? undefined : covers,
    src: view.coverUrl,
  };
  const isDeck = view.kind === "room" || view.kind === "saved";

  return (
    <>
      <CollapsingHeaderBar className={styles.header} collapse={collapse}>
        <PageHeader
          backLabel={t("common.back")}
          eyebrow={view.name}
          leading={
            <CollapsingHeaderCompact className={styles.compactCover} collapse={collapse}>
              <CoverArt {...cover} size="sm" />
            </CollapsingHeaderCompact>
          }
          meta={
            editor.isLoading
              ? undefined
              : t("lobby.playlist.trackCount", { count: allTracks.length })
          }
          onBack={view.onBack}
          title={isDeck ? t("music.editor.heading") : t("music.view.pickHeading")}
        />
      </CollapsingHeaderBar>

      <div className={styles.scroll} ref={setScrollElement}>
        <CollapsingHeaderHero className={styles.hero} collapse={collapse}>
          <CoverArt {...cover} size="hero" />
          {view.sourceLabel ? <p className={styles.source}>{view.sourceLabel}</p> : null}
          {editor.needsCheckCount > 0 ? (
            <Button
              onClick={() =>
                songs.start(editor.tracks.filter(needsYearCheck).map((track) => track.id))
              }
              variant="secondary"
            >
              {t("music.view.review", { count: editor.needsCheckCount })}
            </Button>
          ) : null}
        </CollapsingHeaderHero>

        <FloatingBar className={styles.toolbar} edge="top">
          <PlaylistViewToolbar editor={editor} />
        </FloatingBar>

        <PlaylistViewBody
          editor={editor}
          error={view.error}
          membership={view.membership}
          onOpenTrack={songs.open}
          scrollElement={scrollElement}
        />
      </div>

      <PlaylistViewDock editor={editor} view={view} />

      <PlaylistTrackDetailsSheet
        onClose={songs.close}
        onSave={view.source.updateTrack}
        review={songs.review}
        track={openTrack}
      />
    </>
  );
}

interface PlaylistViewBodyProps {
  editor: UsePlaylistEditorResult;
  error: string | null;
  membership: PlaylistViewModel["membership"];
  onOpenTrack: (trackId: string) => void;
  scrollElement: HTMLDivElement | null;
}

function PlaylistViewBody({
  editor,
  error,
  membership,
  onOpenTrack,
  scrollElement,
}: PlaylistViewBodyProps) {
  const { t } = useI18n();

  if (editor.isLoading) return <ListSkeleton count={4} leading="cover-sm" />;
  if (error) {
    return (
      <p className={styles.status} role="alert">
        {error}
      </p>
    );
  }
  if (editor.tracks.length === 0) {
    return (
      <p className={styles.status}>
        {editor.filter === "needsCheck" && editor.allTracks.length > 0
          ? t("music.filter.noneToCheck")
          : t("lobby.playlist.empty")}
      </p>
    );
  }

  return (
    <PlaylistViewList
      membership={membership}
      onOpenTrack={onOpenTrack}
      onRemoveTrack={editor.removeTrack}
      onToggleSelection={editor.toggleSelection}
      scrollElement={scrollElement}
      selectedIds={editor.selectedIds}
      tracks={editor.tracks}
    />
  );
}

/** One floating action at the bottom: what the selection does, or else what the list does. */
function PlaylistViewDock({
  editor,
  view,
}: {
  editor: UsePlaylistEditorResult;
  view: PlaylistViewModel;
}) {
  const { t } = useI18n();
  const useReasonId = useId();
  const selectedIds = new Set(
    editor.allTracks.filter((track) => editor.selectedIds.has(track.id)).map((track) => track.id),
  );

  return (
    <div className={styles.dock}>
      <SelectionActionBar
        actions={getSelectionActions(view, editor, selectedIds, t)}
        count={selectedIds.size}
      />
      {selectedIds.size === 0 ? (
        <FloatingBar edge="bottom">
          {view.onUse ? (
            <>
              <Button
                aria-describedby={view.useHeldReason ? useReasonId : undefined}
                disabled={view.useHeldReason !== null}
                fullWidth
                haptic
                isLoading={view.isBusy}
                onClick={() => view.onUse?.()}
                size="lg"
              >
                {t("music.view.use")}
              </Button>
              {view.useHeldReason ? (
                <p className={styles.useReason} id={useReasonId}>
                  {view.useHeldReason}
                </p>
              ) : null}
            </>
          ) : (
            <Button disabled fullWidth size="lg" variant="secondary">
              {t("music.view.inGame")}
            </Button>
          )}
        </FloatingBar>
      ) : null}
    </div>
  );
}

function getSelectionActions(
  view: PlaylistViewModel,
  editor: UsePlaylistEditorResult,
  selectedIds: ReadonlySet<string>,
  t: (key: string, params?: Record<string, string | number>) => string,
): SelectionAction[] {
  const { membership } = view;
  if (membership) {
    const inGame = [...selectedIds].filter(membership.isInGame);
    const notInGame = [...selectedIds].filter((trackId) => !membership.isInGame(trackId));
    return getAddRemoveActions(
      {
        addCount: notInGame.length,
        disabled: view.isBusy,
        onAdd: () => {
          membership.add(new Set(notInGame));
          editor.clearSelection();
        },
        onRemove: () => {
          membership.remove(new Set(inGame));
          editor.clearSelection();
        },
        removeCount: inGame.length,
      },
      t,
    );
  }

  const remove: SelectionAction = {
    label: t("lobby.playlist.remove", { count: selectedIds.size }),
    onClick: editor.removeSelected,
    variant: "danger",
  };
  if (view.kind !== "quickPick" || !view.onUse) return [remove];
  const onUseSelected = view.onUse;
  // The selection stays until the songs are in: the use may still ask to add or replace.
  return [
    remove,
    {
      disabled: view.isBusy,
      label: t("lobby.spotify.review.useSelectedTracks", { count: selectedIds.size }),
      onClick: () => onUseSelected(selectedIds),
    },
  ];
}

function noop() {}
