import { describe, expect, it } from "vitest";
import { expectRatchet, listTypeScriptSources } from "./cssSourceFiles";

/**
 * Dialogs and sheets open through `Overlay` and non-modal layers through `LayerPortal`, both
 * in `features/overlay` (`14` §4), which owns layering, Escape, focus, scroll locking and
 * Back. A direct `createPortal` outside it bypasses all of that.
 *
 * `MotionDialogPortal` has no callers since `05` E2b and is left for the owner to delete.
 * The list may only shrink.
 */
const PENDING_MIGRATION = ["features/motion/MotionDialogPortal.tsx"] as const;

const OVERLAY_OWNERS = ["features/overlay/"];
const PORTAL_USE = /\bcreatePortal\(/;

describe("overlay sites", () => {
  const offenders = listTypeScriptSources()
    .filter((file) => !OVERLAY_OWNERS.some((owner) => file.path.startsWith(owner)))
    .filter((file) => PORTAL_USE.test(file.contents))
    .map((file) => file.path);

  it("opens dialogs and sheets through the overlay host", () => {
    const { newOffenders } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      newOffenders,
      "New direct portal. Render an `Overlay` or a `LayerPortal` from features/overlay.",
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
