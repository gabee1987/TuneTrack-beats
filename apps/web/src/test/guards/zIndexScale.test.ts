import { describe, expect, it } from "vitest";
import { expectRatchet, listCssModules } from "./cssSourceFiles";

/**
 * `docs/rules/design_system.md` section 6: every overlay layer resolves to a `--z-*`
 * token. The only permitted literals are -1..9, for stacking inside a single component.
 *
 * This is a ratchet. As `docs/plans/2026-09-stability-performance/06-navigation-and-overlays.md`
 * section 2 migrates each file, remove it from the allowlist below.
 */
const PENDING_MIGRATION = [
  "features/app-shell/AppShellMenu.module.css",
  "features/loading/AppLoadingOverlay.module.css",
  "features/ui/RoomResetModal.module.css",
  "features/ui/SettingField.module.css",
  "pages/GamePage/components/GamePageReconnectToast.module.css",
  "pages/GamePage/components/SongInfoModal.module.css",
  "pages/GamePage/components/gamePageActionPanelsChallenge.module.css",
  "pages/GamePage/components/gamePageActionPanelsDock.module.css",
  "pages/GamePage/components/timelineCelebration.module.css",
  "pages/GamePage/components/timelinePanelShell.module.css",
  "pages/GamePage/gamePageChrome.module.css",
  "pages/GamePage/gamePageMenu.module.css",
  "pages/HomePage/mobile/HomePageMobile.module.css",
  "pages/LobbyPage/components/playlistEditChrome.module.css",
  "pages/LobbyPage/components/spotify/spotifySetupShell.module.css",
] as const;

const MIN_LOCAL_LAYER = -1;
const MAX_LOCAL_LAYER = 9;

function usesUnscaledZIndex(contents: string): boolean {
  const declarations = contents.matchAll(/z-index:\s*([^;]+);/g);

  for (const [, rawValue] of declarations) {
    const value = (rawValue ?? "").trim();

    if (value.startsWith("var(--z-")) {
      continue;
    }

    const numericValue = Number(value);
    if (
      Number.isInteger(numericValue) &&
      numericValue >= MIN_LOCAL_LAYER &&
      numericValue <= MAX_LOCAL_LAYER
    ) {
      continue;
    }

    return true;
  }

  return false;
}

describe("z-index scale", () => {
  const offenders = listCssModules()
    .filter((file) => usesUnscaledZIndex(file.contents))
    .map((file) => file.path);

  it("only uses --z-* tokens or a local -1..9 stacking value", () => {
    const { newOffenders } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      newOffenders,
      "New z-index literals outside the token scale. Use a --z-* token from " +
        "features/theme/tokens/primitives.ts, or a value in -1..9 for stacking inside " +
        "one component.",
    ).toEqual([]);
  });

  it("keeps the pending-migration allowlist honest", () => {
    const { fixedButStillListed } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      fixedButStillListed,
      "These files no longer use raw z-index values. Remove them from PENDING_MIGRATION.",
    ).toEqual([]);
  });
});
