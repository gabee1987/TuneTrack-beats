import { useEffect, useRef } from "react";
import type { UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";

type OpenListKind = "deck" | "found" | "quickPick";

/**
 * One list open at a time: a list that opens closes the ones open before it. On phones the
 * Playlist view covers whatever opens another list; the desktop's second pane does not
 * (`22` §4.12), and two open lists would hide the newer one behind the older.
 */
export function useOneOpenList({ candidates, openedPlaylist, queue }: UseLobbySpotifyResult): void {
  const open: OpenListKind[] = [];
  if (queue.editor) open.push("deck");
  if (openedPlaylist.openedPlaylistPhase !== "idle") open.push("found");
  if (candidates.candidateTracks.length > 0) open.push("quickPick");
  const openKey = open.join(" ");

  const closers: Record<OpenListKind, () => void> = {
    deck: queue.closeEditor,
    found: openedPlaylist.closeOpenedPlaylist,
    quickPick: candidates.discardGeneratedCandidates,
  };
  const closersRef = useRef(closers);
  closersRef.current = closers;
  const previousRef = useRef(open);

  useEffect(() => {
    const current = openKey ? (openKey.split(" ") as OpenListKind[]) : [];
    const newlyOpen = current.filter((kind) => !previousRef.current.includes(kind));
    previousRef.current = current;
    if (newlyOpen.length !== 1) return;

    current.filter((kind) => kind !== newlyOpen[0]).forEach((kind) => closersRef.current[kind]());
  }, [openKey]);
}
