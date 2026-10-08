import { describe, expect, it } from "vitest";
import { expectRatchet, listTypeScriptSources } from "./cssSourceFiles";

/**
 * Dialogs and sheets open through `features/overlay` (`14` §4), which owns layering, Escape,
 * focus, scroll locking and Back. A direct `createPortal` or `MotionDialogPortal` outside it
 * bypasses all of that.
 *
 * The overlays migrate in `05` E2b; the four game-page entries are positioned layers (dock,
 * challenge callout, token flyouts, fly-to-timeline card), not overlays, and move to a host
 * layer portal in E2b as well. The list may only shrink.
 */
const PENDING_MIGRATION = [
  "features/app-shell/components/AppShellMenuDialog.tsx",
  "features/hints/HintBubble.tsx",
  "features/ui/RoomResetModal.tsx",
  "pages/GamePage/components/ActionDock.tsx",
  "pages/GamePage/components/ChallengeActionPanel.tsx",
  "pages/GamePage/components/GamePageActionPanels.tsx",
  "pages/GamePage/components/TimelinePanelFlyAnimation.tsx",
  "pages/LobbyPage/components/PlaylistEditModal.tsx",
  "pages/LobbyPage/components/PlaylistTrackDetailsSheet.tsx",
] as const;

const OVERLAY_OWNERS = ["features/overlay/", "features/motion/MotionDialogPortal.tsx"];
const PORTAL_USE = /\bcreatePortal\(|<MotionDialogPortal\b/;

describe("overlay sites", () => {
  const offenders = listTypeScriptSources()
    .filter((file) => !OVERLAY_OWNERS.some((owner) => file.path.startsWith(owner)))
    .filter((file) => PORTAL_USE.test(file.contents))
    .map((file) => file.path);

  it("opens dialogs and sheets through the overlay host", () => {
    const { newOffenders } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      newOffenders,
      "New direct portal. Render an `Overlay` (or a primitive built on it) from features/overlay.",
    ).toEqual([]);
  });

  it("keeps the pending-migration allowlist honest", () => {
    const { fixedButStillListed } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      fixedButStillListed,
      "These files no longer portal directly. Remove them from PENDING_MIGRATION.",
    ).toEqual([]);
  });
});
