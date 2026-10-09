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
});
