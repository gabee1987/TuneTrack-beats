import { describe, expect, it } from "vitest";
import { listTypeScriptSources } from "./cssSourceFiles";

/**
 * One way to see and change a list of songs (`22` §4.9, owner 2026-10-16): every list opens in
 * the Playlist view and every song in the one Song editor. A second list or editor drifts in
 * looks and rules; this keeps S8 from growing one back.
 */
const SONG_LIST_OWNER = "pages/LobbyPage/components/music/PlaylistViewList.tsx";
const SONG_EDITOR_OWNER = "pages/LobbyPage/components/PlaylistTrackDetailsSheet.tsx";

describe("one song list and one song editor", () => {
  const sources = listTypeScriptSources().filter((file) => !file.path.endsWith(".test.tsx"));

  it("virtualises songs only in the Playlist view's list", () => {
    const owners = sources
      .filter((file) => file.contents.includes("useVirtualizer("))
      .map((file) => file.path);

    expect(owners).toEqual([SONG_LIST_OWNER]);
  });

  it("edits a song's details only in the Song editor", () => {
    const owners = sources
      .filter((file) => /label=\{t\("lobby\.playlist\.fieldReleaseYear"\)\}/.test(file.contents))
      .map((file) => file.path);

    expect(owners).toEqual([SONG_EDITOR_OWNER]);
  });
});
