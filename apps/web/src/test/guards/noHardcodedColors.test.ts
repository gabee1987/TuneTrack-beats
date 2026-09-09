import { describe, expect, it } from "vitest";
import { expectRatchet, listCssModules } from "./cssSourceFiles";

/**
 * `CLAUDE.md` and `docs/rules/design_system.md` section 4: colours, surfaces and shadows
 * come from design tokens. A hex literal in a CSS module is a defect.
 *
 * This is a ratchet. As `docs/plans/2026-09-stability-performance/07-design-system-consolidation.md`
 * phase 3 migrates each file, remove it from the allowlist below. The list must reach
 * empty.
 */
const PENDING_MIGRATION = [
  "features/app-shell/AppShellMenu.module.css",
  "features/loading/AppLoadingOverlay.module.css",
  "features/ui/RoomPrimaryActionButton.module.css",
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

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

describe("no hardcoded colors", () => {
  const offenders = listCssModules()
    .filter((file) => HEX_COLOR.test(file.contents))
    .map((file) => file.path);

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
});
