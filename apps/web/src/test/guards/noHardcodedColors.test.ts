import { describe, expect, it } from "vitest";
import { expectRatchet, listCssModules } from "./cssSourceFiles";

/**
 * `CLAUDE.md` and `docs/rules/design_system.md` section 4: colours, surfaces and shadows
 * come from design tokens. A hex or `rgb()`/`rgba()` literal in a CSS module is a defect.
 *
 * These are ratchets. As `docs/plans/2026-10-project-review/15-design-system-consolidation.md`
 * Phase 3 migrates each file, remove it from the allowlists below. Both lists must reach
 * empty.
 */
const PENDING_MIGRATION = [
  "features/app-shell/AppShellMenu.module.css",
  "features/loading/AppLoadingOverlay.module.css",
  "features/ui/RoomResetModal.module.css",
  "features/ui/SettingField.module.css",
  "features/ui/ToggleSwitch.module.css",
  "pages/GamePage/components/gamePageActionPanelsChallenge.module.css",
  "pages/GamePage/components/gamePageActionPanelsDock.module.css",
  "pages/GamePage/components/timelineCards.module.css",
  "pages/GamePage/gamePageMenu.module.css",
  "pages/GamePage/gamePagePlayback.module.css",
  "pages/LobbyPage/components/SelectableArtwork.module.css",
  "pages/LobbyPage/components/playlistEditChrome.module.css",
  "pages/LobbyPage/components/playlistEditList.module.css",
  "pages/LobbyPage/components/spotify/spotifyDiscovery.module.css",
  "pages/LobbyPage/components/spotify/spotifyPanels.module.css",
  "pages/LobbyPage/components/spotify/spotifySetupImport.module.css",
  "pages/LobbyPage/components/spotify/spotifySetupShell.module.css",
  "pages/LobbyPage/lobbySettings.module.css",
  "pages/LobbyPage/lobbySheets.module.css",
] as const;

const PENDING_RGB_MIGRATION = [
  "features/app-shell/AppShellMenu.module.css",
  "features/toast/AppToastStack.module.css",
  "features/ui/ToggleSwitch.module.css",
  "pages/GamePage/components/GamePageToastStack.module.css",
  "pages/GamePage/components/gamePageActionPanelsChallenge.module.css",
  "pages/GamePage/components/gamePageActionPanelsDock.module.css",
  "pages/GamePage/components/timelineCards.module.css",
  "pages/GamePage/components/timelinePanelShell.module.css",
  "pages/LobbyPage/components/spotify/spotifySetupShell.module.css",
] as const;

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
// Literal channels only; `rgb(var(--token) / 50%)` stays allowed.
const RGB_COLOR = /\brgba?\(\s*\d/;

function offendersMatching(pattern: RegExp): string[] {
  return listCssModules()
    .filter((file) => pattern.test(file.contents))
    .map((file) => file.path);
}

describe("no hardcoded colors", () => {
  const offenders = offendersMatching(HEX_COLOR);
  const rgbOffenders = offendersMatching(RGB_COLOR);

  it("uses semantic tokens instead of hex literals", () => {
    const { newOffenders } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      newOffenders,
      "New hex colour literals. Use a semantic token, or add one to " +
        "features/theme/darkThemeTokens.ts and its light-theme counterpart.",
    ).toEqual([]);
  });

  it("keeps the pending-migration allowlist honest", () => {
    const { fixedButStillListed } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      fixedButStillListed,
      "These files no longer contain hex literals. Remove them from PENDING_MIGRATION.",
    ).toEqual([]);
  });

  it("uses semantic tokens instead of rgb() literals", () => {
    const { newOffenders } = expectRatchet(rgbOffenders, PENDING_RGB_MIGRATION);

    expect(
      newOffenders,
      "New rgb()/rgba() colour literals. Use a semantic token, or add one to " +
        "features/theme/darkThemeTokens.ts and its light-theme counterpart.",
    ).toEqual([]);
  });

  it("keeps the rgb pending-migration allowlist honest", () => {
    const { fixedButStillListed } = expectRatchet(rgbOffenders, PENDING_RGB_MIGRATION);

    expect(
      fixedButStillListed,
      "These files no longer contain rgb() literals. Remove them from PENDING_RGB_MIGRATION.",
    ).toEqual([]);
  });
});
