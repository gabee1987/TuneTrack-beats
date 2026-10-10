import { describe, expect, it } from "vitest";
import { expectRatchet, listTypeScriptSources } from "./cssSourceFiles";

/**
 * A framer `layout` container measures its subtree on every commit, and the game page commits
 * on every socket update and drag step (05 C4, finding F-13). Bare `layout` is banned; the
 * remaining sites animate small, local elements and are listed here so a new one is a
 * deliberate decision.
 */
const ALLOWED_LAYOUT_SITES = [
  "features/app-shell/components/AppShellMenuSheet.tsx",
  "pages/GamePage/components/TimelinePanelHeader.tsx",
  "pages/GamePage/components/turnActions/TurnActionSlot.tsx",
  // Owner decision 19 (2026-10-07): the timeline column slides when the header changes height.
  "pages/GamePage/desktop/GamePageDesktop.tsx",
  "pages/GamePage/mobile/GamePageMobile.tsx",
  // Owner decision 19 (2026-10-07): the TT settings slide stays.
  "pages/LobbyPage/components/LobbyHostTtSettings.tsx",
] as const;

const BARE_LAYOUT_PROP =
  /^\s*layout(=\{true\})?\s*$|<[\w.]+\s[^>\n]*\blayout(=\{true\})?(?=[\s/>])/m;
const LAYOUT_SITE = /\slayout(Id)?=["{]|<LayoutGroup\b/;

describe("framer layout animation sites", () => {
  const sources = listTypeScriptSources();

  it("never uses a bare layout prop", () => {
    const offenders = sources
      .filter((file) => BARE_LAYOUT_PROP.test(file.contents))
      .map((file) => file.path);

    expect(
      offenders,
      'Bare `layout` measures the whole subtree on every commit. Animate transform/opacity, or use layout="position" on a small element.',
    ).toEqual([]);
  });

  it("keeps the layout sites to the allowlist", () => {
    const sites = sources
      .filter((file) => BARE_LAYOUT_PROP.test(file.contents) || LAYOUT_SITE.test(file.contents))
      .map((file) => file.path);
    const { fixedButStillListed, newOffenders } = expectRatchet(sites, ALLOWED_LAYOUT_SITES);

    expect(newOffenders, "New framer layout site; see 05 §2.2 before adding one.").toEqual([]);
    expect(fixedButStillListed, "Layout site removed; drop it from the allowlist.").toEqual([]);
  });
});
