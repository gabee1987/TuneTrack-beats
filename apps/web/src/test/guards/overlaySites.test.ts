import { describe, expect, it } from "vitest";
import { listTypeScriptSources } from "./cssSourceFiles";

/**
 * Dialogs and sheets open through `Overlay`, steps inside them through `PanelView`, and
 * non-modal layers through `LayerPortal`, all in `features/overlay` (`14` §4), which owns
 * layering, Escape, focus, the scroll guard and Back. A direct `createPortal` outside it
 * bypasses all of that.
 */
const OVERLAY_OWNER = "features/overlay/";
const PORTAL_USE = /\bcreatePortal\(/;

/**
 * No overlay nests deeper than two `PanelView`s (`22` §13): Music setup opens a song list, and
 * a song opens from it or on its own. A new site is a third step unless it replaces one of these.
 * What's new is the menu's only step.
 */
const PANEL_VIEW_SITES = [
  "features/app-shell/whats-new/WhatsNewView.tsx",
  "pages/LobbyPage/components/PlaylistTrackDetailsSheet.tsx",
  "pages/LobbyPage/components/music/MusicSongDetails.tsx",
  "pages/LobbyPage/components/music/PlaylistView.tsx",
];
const PANEL_VIEW_USE = /<PanelView\b/;
const GALLERY = "pages/DesignSystemPage/";

describe("overlay sites", () => {
  it("opens dialogs, sheets and layers only through features/overlay", () => {
    const offenders = listTypeScriptSources()
      .filter((file) => !file.path.startsWith(OVERLAY_OWNER))
      .filter((file) => PORTAL_USE.test(file.contents))
      .map((file) => file.path);

    expect(
      offenders,
      "New direct portal. Render an `Overlay`, a `PanelView` or a `LayerPortal` from features/overlay.",
    ).toEqual([]);
  });

  it("opens panel views only from the song list, the two song views and What's new", () => {
    const sites = listTypeScriptSources()
      .filter((file) => !file.path.startsWith(OVERLAY_OWNER) && !file.path.startsWith(GALLERY))
      .filter((file) => !file.path.includes(".test."))
      .filter((file) => PANEL_VIEW_USE.test(file.contents))
      .map((file) => file.path)
      .sort();

    expect(sites, "A new PanelView site adds a third step; reuse one of these instead.").toEqual(
      PANEL_VIEW_SITES,
    );
  });
});
